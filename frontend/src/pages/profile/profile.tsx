import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Pencil, Upload, VideoOff, Pin, Flame, Hash, Clock } from 'lucide-react';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import { domain } from '@domain';
import { comments as commentsApi } from '@api';
import { toVuid } from '@api';
import { Avatar, Button, Tooltip } from '@ui';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import EmptyState from '@ui/empty/empty';
import './profile.css';
import { useAuth, useVideo, useProfileVideos } from '@hooks';
import { useAppSelector } from '@store';
import { selectWatchedTagFrequency } from '@store/videoSelectors';
import { VideoFilter, SortBy, videoUrl, type FilterState } from '@utils';
import type { Video, VideoId, Tag, Comment } from '@models';
import { useEditVideoModal } from './hooks/useEditVideoModal';
import { useEditProfileModal } from './hooks/useEditProfileModal';
import { useDeleteVideoModal } from './hooks/useDeleteVideoModal';
import EditVideoModal from './components/EditVideoModal';
import EditProfileModal from './components/EditProfileModal';
import DeleteVideoModal from './components/DeleteVideoModal';
import ProfileStats from './components/ProfileStats';
import ProfileCoverStory from './components/ProfileCoverStory';
import ProfileDiamondTiers from './components/ProfileDiamondTiers';
import ProfileTopicGrid from './components/ProfileTopicGrid';

function formatWatchTime(seconds: number): string {
    const totalMinutes = Math.floor(seconds / 60);
    const isLessThanHour = totalMinutes < 60;
    if (isLessThanHour) {
        return `${totalMinutes}m`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

export default function ProfilePage() {
    const { t } = useTranslation();
    const { id: idParam } = useParams<{ id?: string }>();
    const { user, updateProfile } = useAuth();
    const {
        videos, watchHistory, likedVideos, videoProgress,
        pinnedVideoId, editVideo, deleteVideo, openUploadModal,
    } = useVideo();

    const isOwnProfile = !idParam || String(user!.id) === idParam;
    const channelId = isOwnProfile ? String(user!.id) : idParam!;

    const { videosState, setVideos } = useProfileVideos(channelId, isOwnProfile);
    const ownVideos = videosState.kind === 'ok' ? videosState.data : [];
    const isLoadingVideos = videosState.kind === 'loading';
    const watchedTagFrequency = useAppSelector(selectWatchedTagFrequency);

    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const [spotlightComments, setSpotlightComments] = useState<Comment[]>([]);

    const {
        editingVideo, editTitle, editDescription, editTags,
        setEditTitle, setEditDescription, setEditTags,
        handleEditOpen, handleEditClose, handleEditSubmit,
    } = useEditVideoModal();

    const {
        editProfileOpen, editName, editBio, setEditName, setEditBio,
        handleEditProfileOpen, handleEditProfileClose, handleEditProfileSubmit,
    } = useEditProfileModal();

    const {
        videoToDelete,
        handleDeleteById, handleDeleteConfirm, handleDeleteCancel,
    } = useDeleteVideoModal();

    const allTags = useMemo(() => {
        const tagSet = new Set<Tag>(ownVideos.flatMap((v: Video) => v.tags));
        return Array.from(tagSet).sort();
    }, [ownVideos]);

    const pinnedVideo = useMemo(
        () => (isOwnProfile && pinnedVideoId)
            ? videos.find(v => v.id === pinnedVideoId) ?? null
            : null,
        [isOwnProfile, pinnedVideoId, videos],
    );

    const deckGhostVideos = useMemo(() => {
        const isNotOwn = !isOwnProfile;
        const hasNoPinned = pinnedVideo === null;

        if (isNotOwn || hasNoPinned) {
            return [];
        }

        return ownVideos
            .filter(v => domain.video.isPublished(v) && v.id !== pinnedVideo.id)
            .sort((a, b) => b.views - a.views)
            .slice(0, 2);
    }, [isOwnProfile, pinnedVideo, ownVideos]);

    const filteredVideos = useMemo(
        () => VideoFilter.apply(ownVideos, filterState).filter(v => v.id !== pinnedVideo?.id),
        [ownVideos, filterState, pinnedVideo],
    );

    const allVideosRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const SECTIONS_THRESHOLD = 8;
    const sections = useMemo(() => {
        const isFiltered = !VideoFilter.isEmpty(filterState);
        const published = ownVideos.filter(v => domain.video.isPublished(v));
        const hasEnough = published.length >= SECTIONS_THRESHOLD;

        if (isFiltered || !hasEnough) {
            return null;
        }

        const featured = pinnedVideo
            ?? [...published].sort((a, b) => b.views - a.views)[0]
            ?? null;

        const latest = [...published]
            .sort((a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime())
            .filter(v => v.id !== featured?.id)
            .slice(0, 5);

        const mostViewed = [...published]
            .sort((a, b) => b.views - a.views)
            .filter(v => v.id !== featured?.id)
            .slice(0, 6);

        const tagCounts = new Map<Tag, number>();
        for (const video of published) {
            for (const tag of video.tags) {
                const isShorts = tag === 'shorts';
                if (!isShorts) {
                    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
                }
            }
        }
        const tagSections = [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .filter(([, count]) => count >= 2)
            .map(([tag, count]) => ({
                tag,
                count,
                videos: published
                    .filter(v => v.tags.includes(tag))
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 3),
            }));

        return { featured, latest, mostViewed, tagSections };
    }, [ownVideos, filterState, pinnedVideo]);

    function scrollToAllVideos(newFilter?: Partial<FilterState>) {
        if (newFilter) {
            setFilterState({ ...VideoFilter.emptyState(), ...newFilter });
        }

        setTimeout(() => {
            allVideosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    const featuredId = sections?.featured?.id ?? null;

    useEffect(() => {
        const isNoFeatured = featuredId === null;
        if (isNoFeatured) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSpotlightComments([]);
            return;
        }
        commentsApi.list(toVuid(featuredId), { page: 1 }).then(res => {
            if (res.ok) {
                setSpotlightComments(res.data.data.slice(0, 2));
            }
        });
    }, [featuredId]);

    const channelName = isOwnProfile
        ? (user?.name ?? '')
        : (ownVideos[0]?.channel ?? idParam ?? '');

    const profileBio = isOwnProfile ? (user?.bio ?? '') : '';

    // ─── Personal stats (own profile only) ────────────────────────────────────
    const stats = useMemo(() => {
        const isNotOwn = !isOwnProfile;
        if (isNotOwn) {
            return null;
        }

        const videosWatched = watchHistory.length;

        // VISUAL-11: accurate watch time using video duration
        const totalWatchSeconds = watchHistory.reduce((sum: number, id: VideoId) => {
            const video = videos.find((v: Video) => v.id === id);
            const duration = video?.duration ?? 600;
            const progress = videoProgress[id] ?? 0;
            return sum + (progress / 100) * duration;
        }, 0);

        const watchTimeStr = formatWatchTime(totalWatchSeconds);

        const topTags = [...watchedTagFrequency.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag]) => tag);

        const likedCount = likedVideos.size;

        return { videosWatched, watchTimeStr, topTags, likedCount };
    }, [isOwnProfile, watchHistory, videoProgress, videos, likedVideos, watchedTagFrequency]);

    function handleCoverWatchClick(e: React.MouseEvent) {
        e.stopPropagation();
        const featuredVideoId = sections?.featured?.id;
        const hasFeaturedVideoId = featuredVideoId !== undefined;
        if (hasFeaturedVideoId) {
            navigate(videoUrl(featuredVideoId));
        }
    }

    const hasVideos = filteredVideos.length > 0;

    return (
        <div className="profile-page">
            <div className="profile-page__banner" aria-hidden="true" />

            <div className="profile-page__header">
                <div className="profile-page__avatar-section">
                    <Avatar name={channelName} size="lg" />
                </div>
                <div className="profile-page__info">
                    <div className="profile-page__name-row">
                        <h1 className="profile-page__name">{channelName}</h1>
                        {isOwnProfile && (
                            <div className="profile-page__header-actions">
                                <Tooltip content={t('video.upload')} side="bottom">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label={t('video.upload')}
                                        onClick={() => openUploadModal()}
                                    >
                                        <Upload size={15} />
                                    </Button>
                                </Tooltip>
                                <Tooltip content={t('profile.edit_profile')} side="bottom">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label={t('profile.edit_profile')}
                                        onClick={() => handleEditProfileOpen(user?.name ?? '', user?.bio ?? '')}
                                    >
                                        <Pencil size={15} />
                                    </Button>
                                </Tooltip>
                            </div>
                        )}
                    </div>

                    <p className="profile-page__subtitle">
                        {t('video.videos_count', { count: ownVideos.length })}
                    </p>

                    {profileBio && (
                        <p className="profile-page__bio">{profileBio}</p>
                    )}

                    {stats && <ProfileStats stats={stats} />}

                </div>
            </div>

            <div className="profile-page__filters">
                <FilterPanel
                    allTags={allTags}
                    value={filterState}
                    onChange={setFilterState}
                />
            </div>

            {sections !== null && !isLoadingVideos && (
                <div className="profile-page__sections">
                    {/* ─── Cover Story ─── */}
                    {sections.featured !== null && (
                        <ProfileCoverStory
                            featured={sections.featured}
                            spotlightComments={spotlightComments}
                            onNavigate={id => navigate(videoUrl(id))}
                            onWatchClick={handleCoverWatchClick}
                        />
                    )}

                    {/* ─── Latest Uploads (asymmetric 5-up mosaic) ─── */}
                    {sections.latest.length > 0 && (
                        <div className="profile-page__section">
                            <div className="profile-page__section-header">
                                <h3 className="profile-page__section-title">
                                    <Clock size={16} strokeWidth={2} />
                                    {t('channel.latest_uploads')}
                                </h3>
                                <button type="button" className="profile-page__section-see-all" onClick={() => scrollToAllVideos({ sortBy: SortBy.RECENT })}>
                                    {t('channel.see_all')}
                                </button>
                            </div>
                            <div className="profile-page__latest-grid">
                                {sections.latest.map(video => (
                                    <VideoCard key={video.id} video={video} showActions={isOwnProfile} onEdit={handleEditOpen} onDelete={id => handleDeleteById(id, ownVideos)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── Top Videos (diamond pyramid) ─── */}
                    {sections.mostViewed.length >= 1 && (
                        <div className="profile-page__section">
                            <div className="profile-page__section-header">
                                <h3 className="profile-page__section-title">
                                    <Flame size={16} strokeWidth={2} />
                                    {t('channel.top_videos')}
                                </h3>
                                <button type="button" className="profile-page__section-see-all" onClick={() => scrollToAllVideos({ sortBy: SortBy.VIEWS })}>
                                    {t('channel.see_all')}
                                </button>
                            </div>
                            <ProfileDiamondTiers
                                videos={sections.mostViewed}
                                onNavigate={id => navigate(videoUrl(id))}
                            />
                        </div>
                    )}

                    {/* ─── By Topic (magazine covers) ─── */}
                    {sections.tagSections.length > 0 && (
                        <div className="profile-page__section">
                            <div className="profile-page__section-header">
                                <h3 className="profile-page__section-title">
                                    <Hash size={15} strokeWidth={2.5} />
                                    {t('channel.by_topic')}
                                </h3>
                            </div>
                            <ProfileTopicGrid
                                tagSections={sections.tagSections}
                                onSelectTag={tag => scrollToAllVideos({ tags: [tag] })}
                            />
                        </div>
                    )}
                </div>
            )}

            <main className="profile-page__main">
                {isLoadingVideos && (
                    <div className="profile-page__grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <VideoCardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {sections !== null && !isLoadingVideos && (
                    <div className="profile-page__all-videos-header" ref={allVideosRef}>
                        <h3 className="profile-page__section-title">
                            <Play size={15} strokeWidth={2} />
                            {t('channel.all_videos')}
                        </h3>
                    </div>
                )}

                {sections === null && !isLoadingVideos && pinnedVideo && (
                    <div className="profile-page__pinned">
                        <div className="profile-page__pinned-header">
                            <Pin size={13} />
                            <span className="profile-page__pinned-label">{t('profile.pinned_video')}</span>
                        </div>
                        <div className="profile-page__deck">
                            {deckGhostVideos[1] && (
                                <div
                                    className="profile-page__deck-ghost profile-page__deck-ghost--2"
                                    style={{ backgroundImage: `url(${deckGhostVideos[1].thumbnail})` }}
                                    aria-hidden="true"
                                />
                            )}
                            {deckGhostVideos[0] && (
                                <div
                                    className="profile-page__deck-ghost profile-page__deck-ghost--1"
                                    style={{ backgroundImage: `url(${deckGhostVideos[0].thumbnail})` }}
                                    aria-hidden="true"
                                />
                            )}
                            <div className="profile-page__deck-main">
                                <VideoCard
                                    video={pinnedVideo}
                                    showActions={true}
                                    onEdit={handleEditOpen}
                                    onDelete={id => handleDeleteById(id, ownVideos)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {!isLoadingVideos && hasVideos && (
                    <div className="profile-page__grid">
                        {filteredVideos.map((video, i) => {
                            const isPinned = video.id === pinnedVideoId;
                            return (
                                <div key={video.id} className="profile-page__card-wrapper">
                                    {isPinned && isOwnProfile && (
                                        <div className="profile-page__pinned-badge" aria-label={t('video.pinned')}>
                                            <Pin size={10} />
                                            <span>{t('video.pinned')}</span>
                                        </div>
                                    )}
                                    <VideoCard
                                        video={video}
                                        index={i}
                                        showActions={isOwnProfile}
                                        onEdit={handleEditOpen}
                                        onDelete={id => handleDeleteById(id, ownVideos)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
                {!isLoadingVideos && !hasVideos && (
                    <EmptyState
                        icon={<VideoOff size={36} strokeWidth={1.5} />}
                        title={t('video.no_own_videos')}
                    />
                )}
            </main>

            <EditVideoModal
                editingVideo={editingVideo}
                editTitle={editTitle}
                editDescription={editDescription}
                editTags={editTags}
                onTitleChange={v => setEditTitle(v)}
                onDescriptionChange={v => setEditDescription(v)}
                onTagsChange={tags => setEditTags(tags)}
                onSubmit={e => handleEditSubmit(e, (id, payload) => {
                    editVideo(id, payload);
                    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...payload } : v));
                })}
                onClose={handleEditClose}
            />

            <EditProfileModal
                isOpen={editProfileOpen}
                editName={editName}
                editBio={editBio}
                onNameChange={v => setEditName(v)}
                onBioChange={v => setEditBio(v)}
                onSubmit={e => handleEditProfileSubmit(e, (name, bio) => updateProfile(name, bio))}
                onClose={handleEditProfileClose}
            />

            <DeleteVideoModal
                videoToDelete={videoToDelete}
                onConfirm={() => handleDeleteConfirm(id => {
                    deleteVideo(id);
                    setVideos(prev => prev.filter(v => v.id !== id));
                })}
                onCancel={handleDeleteCancel}
            />
        </div>
    );
}

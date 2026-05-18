import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Eye, Heart, Tag as TagIcon, Pencil, Upload, VideoOff, Pin, Trash2, Flame, Hash, Clock, Camera } from 'lucide-react';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import { VideoFilter, SortBy } from '@utils/applyFilters';
import { TagColors } from '@utils/tagColors';
import type { FilterState } from '@utils/applyFilters';
import type { Video, VideoId } from '@models/video';
import { VideoStatus } from '@models/video';
import type { Tag } from '@models/tag';
import { Format } from '@utils/format';
import { videoUrl } from '@utils/routes';
import { comments as commentsApi } from '@api';
import type { Comment } from '@models/comment';
import type { Vuid } from '@api';
import { useAuth } from '@hooks/useAuth';
import { useVideo } from '@hooks/useVideo';
import { useProfileVideos } from '@hooks/useProfileVideos';
import { Avatar, Button, Input, Modal, Tooltip } from '@ui';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import EmptyState from '@ui/empty/empty';
import TagInput from '@components/tag/input';
import './profile.css';

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

    const { ownVideos, setOwnVideos, loadingOwnVideos } = useProfileVideos(channelId, isOwnProfile);

    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editTags, setEditTags] = useState<Tag[]>([]);

    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');

    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
    const [spotlightComments, setSpotlightComments] = useState<Comment[]>([]);

    const allTags = useMemo(() => {
        const tagSet = new Set(ownVideos.flatMap((v: Video) => v.tags));
        return Array.from(tagSet).sort() as unknown as Tag[];
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
            .filter(v => v.status === VideoStatus.PUBLISHED && v.id !== pinnedVideo.id)
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
        const published = ownVideos.filter(v => v.status === VideoStatus.PUBLISHED);
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

        const tagCounts = new Map<string, number>();
        for (const v of published) {
            for (const tag of v.tags) {
                const isShorts = tag === 'shorts';
                if (!isShorts) {
                    tagCounts.set(tag as unknown as string, (tagCounts.get(tag as unknown as string) ?? 0) + 1);
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
                    .filter(v => (v.tags as unknown as string[]).includes(tag))
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
        commentsApi.list(featuredId as unknown as Vuid, { page: 1 }).then(res => {
            const hasResult = res !== null;
            if (hasResult) {
                setSpotlightComments(res.data.slice(0, 2));
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
        const totalWatchSeconds = watchHistory.reduce((sum: number, id: string) => {
            const video = videos.find((v: Video) => v.id === (id as unknown as typeof v.id));
            const duration = video?.duration ?? 600;
            const progress = videoProgress[id] ?? 0;
            return sum + (progress / 100) * duration;
        }, 0);

        const watchTimeStr = formatWatchTime(totalWatchSeconds);

        const tagFreq = new Map<string, number>();
        for (const id of watchHistory) {
            const video = videos.find((v: Video) => v.id === (id as unknown as typeof v.id));
            if (!video) {
                continue;
            }
            for (const tag of video.tags) {
                tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
            }
        }
        const topTags = [...tagFreq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag]) => tag);

        const likedCount = likedVideos.size;

        return { videosWatched, watchTimeStr, topTags, likedCount };
    }, [isOwnProfile, watchHistory, videoProgress, videos, likedVideos]);

    function handleEditOpen(video: Video) {
        setEditingVideo(video);
        setEditTitle(video.title);
        setEditDescription(video.description);
        setEditTags(video.tags);
    }

    function handleEditClose() {
        setEditingVideo(null);
    }

    function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        const hasTitleEmpty = editTitle.trim() === '';
        if (hasTitleEmpty) {
            return;
        }
        const partial = {
            title: editTitle.trim(),
            description: editDescription.trim(),
            tags: editTags,
        };
        editVideo(editingVideo!.id, partial);
        setOwnVideos(prev => prev.map(v => v.id === editingVideo!.id ? { ...v, ...partial } : v));
        handleEditClose();
    }

    function handleEditProfileOpen() {
        setEditName(user?.name ?? '');
        setEditBio(user?.bio ?? '');
        setEditProfileOpen(true);
    }

    function handleEditProfileSubmit(e: React.FormEvent) {
        e.preventDefault();
        const hasNameEmpty = editName.trim() === '';
        if (hasNameEmpty) {
            return;
        }
        updateProfile(editName.trim(), editBio.trim());
        setEditProfileOpen(false);
    }

    // UX-11: delete confirmation handlers
    function handleDeleteClick(video: Video) {
        setVideoToDelete(video);
    }

    function handleDeleteConfirm() {
        const hasVideoToDelete = videoToDelete !== null;
        if (!hasVideoToDelete) {
            return;
        }
        deleteVideo(videoToDelete.id);
        setOwnVideos(prev => prev.filter(v => v.id !== videoToDelete.id));
        setVideoToDelete(null);
    }

    function handleDeleteCancel() {
        setVideoToDelete(null);
    }

    function handleDeleteById(id: VideoId) {
        const video = ownVideos.find(v => v.id === id);
        const hasVideo = video !== undefined;
        if (hasVideo) {
            handleDeleteClick(video);
        }
    }

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
                                        onClick={handleEditProfileOpen}
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

                    {stats && (
                        <div className="profile-page__stats-grid">
                            <div className="profile-page__stat">
                                <Play size={13} className="profile-page__stat-icon" />
                                <span className="profile-page__stat-value">{stats.videosWatched}</span>
                                <span className="profile-page__stat-label">{t('profile.videos_watched')}</span>
                            </div>
                            <div className="profile-page__stat">
                                <Clock size={13} className="profile-page__stat-icon" />
                                <span className="profile-page__stat-value">{stats.watchTimeStr}</span>
                                <span className="profile-page__stat-label">{t('profile.watch_time')}</span>
                            </div>
                            <div className="profile-page__stat">
                                <Heart size={13} className="profile-page__stat-icon" />
                                <span className="profile-page__stat-value">{stats.likedCount}</span>
                                <span className="profile-page__stat-label">{t('profile.liked_count')}</span>
                            </div>
                            {stats.topTags.length > 0 && (
                                <div className="profile-page__stat profile-page__stat--tags">
                                    <TagIcon size={13} className="profile-page__stat-icon" />
                                    <div className="profile-page__top-tags">
                                        {stats.topTags.map(tag => {
                                            const p = TagColors.palette(tag);
                                            return (
                                                <span
                                                    key={tag}
                                                    className="profile-page__top-tag"
                                                    style={{ background: p.bg, color: p.color }}
                                                >
                                                    {tag}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            <div className="profile-page__filters">
                <FilterPanel
                    allTags={allTags}
                    value={filterState}
                    onChange={setFilterState}
                />
            </div>

            {sections !== null && !loadingOwnVideos && (
                <div className="profile-page__sections">
                    {/* ─── Cover Story ─── */}
                    {sections.featured !== null && (
                        <div
                            className="profile-page__cover"
                            style={{ backgroundImage: `url(${sections.featured.thumbnail})` }}
                            role="button"
                            tabIndex={0}
                            aria-label={sections.featured.title}
                            onClick={() => navigate(videoUrl(sections.featured!.id))}
                            onKeyDown={e => e.key === 'Enter' && navigate(videoUrl(sections.featured!.id))}
                        >
                            <div className="profile-page__cover-content">
                                <span className="profile-page__cover-badge">{t('channel.cover_badge')}</span>
                                <h2 className="profile-page__cover-title">{sections.featured.title}</h2>
                                <div className="profile-page__cover-meta">
                                    <Eye size={13} />
                                    {Format.views(sections.featured.views)} {t('video.views')}
                                    {sections.featured.publishedAt && (
                                        <>
                                            <span className="profile-page__cover-sep" />
                                            {Format.relativeDate(sections.featured.publishedAt)}
                                        </>
                                    )}
                                </div>
                                {sections.featured.tags.length > 0 && (
                                    <div className="profile-page__cover-tags">
                                        {sections.featured.tags.slice(0, 4).map(tag => {
                                            const p = TagColors.palette(tag as unknown as string);
                                            const tagStyle = { background: p.bg, color: p.color };
                                            return (
                                                <span key={tag as unknown as string} className="profile-page__cover-tag" style={tagStyle}>
                                                    {tag as unknown as string}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                {spotlightComments.length > 0 && (
                                    <>
                                        <div className="profile-page__cover-divider" />
                                        <div className="profile-page__cover-comments">
                                            {spotlightComments.map(c => (
                                                <p key={c.id} className="profile-page__cover-comment-text">
                                                    "{c.content}" — {c.author.name}
                                                </p>
                                            ))}
                                        </div>
                                    </>
                                )}
                                <div className="profile-page__cover-bottom">
                                    <button
                                        type="button"
                                        className="profile-page__cover-watch btn btn--primary btn--sm"
                                        onClick={handleCoverWatchClick}
                                    >
                                        <Play size={13} fill="currentColor" />
                                        {t('video.watch_now')}
                                    </button>
                                </div>
                            </div>
                        </div>
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
                                    <VideoCard key={video.id} video={video} showActions={isOwnProfile} onEdit={handleEditOpen} onDelete={handleDeleteById} />
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
                            <div className="profile-page__diamond-tiers">
                                <div className="profile-page__diamond-tier">
                                    <div
                                        className="profile-page__diamond"
                                        style={{ backgroundImage: `url(${sections.mostViewed[0].thumbnail})` }}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => navigate(videoUrl(sections.mostViewed[0].id))}
                                        onKeyDown={e => e.key === 'Enter' && navigate(videoUrl(sections.mostViewed[0].id))}
                                    >
                                        <div className="profile-page__diamond-overlay">
                                            <div className="profile-page__diamond-info">
                                                <span className="profile-page__diamond-rank">#1</span>
                                                <span className="profile-page__diamond-title">{sections.mostViewed[0].title}</span>
                                                <span className="profile-page__diamond-views">{Format.views(sections.mostViewed[0].views)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {sections.mostViewed.length >= 3 && (
                                    <div className="profile-page__diamond-tier">
                                        {sections.mostViewed.slice(1, 3).map((video, i) => (
                                            <div
                                                key={video.id}
                                                className="profile-page__diamond"
                                                style={{ backgroundImage: `url(${video.thumbnail})` }}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => navigate(videoUrl(video.id))}
                                                onKeyDown={e => e.key === 'Enter' && navigate(videoUrl(video.id))}
                                            >
                                                <div className="profile-page__diamond-overlay">
                                                    <div className="profile-page__diamond-info">
                                                        <span className="profile-page__diamond-rank">#{i + 2}</span>
                                                        <span className="profile-page__diamond-title">{video.title}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {sections.mostViewed.length >= 6 && (
                                    <div className="profile-page__diamond-tier">
                                        {sections.mostViewed.slice(3, 6).map((video, i) => (
                                            <div
                                                key={video.id}
                                                className="profile-page__diamond"
                                                style={{ backgroundImage: `url(${video.thumbnail})` }}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => navigate(videoUrl(video.id))}
                                                onKeyDown={e => e.key === 'Enter' && navigate(videoUrl(video.id))}
                                            >
                                                <div className="profile-page__diamond-overlay">
                                                    <div className="profile-page__diamond-info">
                                                        <span className="profile-page__diamond-rank">#{i + 4}</span>
                                                        <span className="profile-page__diamond-title">{video.title}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
                            <div className="profile-page__topics">
                                {sections.tagSections.map(({ tag, count, videos: tagVideos }) => {
                                    const coverThumb = tagVideos[0]?.thumbnail ?? '';
                                    return (
                                        <div
                                            key={tag}
                                            className="profile-page__topic-cover"
                                            style={{ backgroundImage: `url(${coverThumb})` }}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => scrollToAllVideos({ tags: [tag as unknown as Tag] })}
                                            onKeyDown={e => e.key === 'Enter' && scrollToAllVideos({ tags: [tag as unknown as Tag] })}
                                        >
                                            <div className="profile-page__topic-cover-content">
                                                <span className="profile-page__topic-cover-tag">#{tag}</span>
                                                <span className="profile-page__topic-cover-count">
                                                    {t('channel.topic_videos', { count })}
                                                </span>
                                                <div className="profile-page__topic-cover-list">
                                                    {tagVideos.map(v => (
                                                        <span key={v.id} className="profile-page__topic-cover-item">{v.title}</span>
                                                    ))}
                                                </div>
                                                <div className="profile-page__topic-cover-footer">
                                                    <button
                                                        type="button"
                                                        className="profile-page__topic-cover-see-all"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            scrollToAllVideos({ tags: [tag as unknown as Tag] });
                                                        }}
                                                    >
                                                        {t('channel.see_all')} →
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <main className="profile-page__main">
                {loadingOwnVideos && (
                    <div className="profile-page__grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <VideoCardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {sections !== null && !loadingOwnVideos && (
                    <div className="profile-page__all-videos-header" ref={allVideosRef}>
                        <h3 className="profile-page__section-title">
                            <Play size={15} strokeWidth={2} />
                            {t('channel.all_videos')}
                        </h3>
                    </div>
                )}

                {sections === null && !loadingOwnVideos && pinnedVideo && (
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
                                    onDelete={handleDeleteById}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {!loadingOwnVideos && hasVideos && (
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
                                        onDelete={handleDeleteById}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
                {!loadingOwnVideos && !hasVideos && (
                    <EmptyState
                        icon={<VideoOff size={36} strokeWidth={1.5} />}
                        title={t('video.no_own_videos')}
                    />
                )}
            </main>

            {/* ─── Edit video modal ─── */}
            <Modal
                isOpen={editingVideo !== null}
                onClose={handleEditClose}
                title={t('video.edit_video')}
                size="md"
            >
                <form className="profile-page__edit-form" onSubmit={handleEditSubmit}>
                    <Input
                        label={t('video.upload_title')}
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder={t('video.upload_title')}
                    />

                    <div className="profile-page__edit-field">
                        <label className="profile-page__edit-label">{t('video.upload_description')}</label>
                        <textarea
                            className="profile-page__edit-textarea"
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="profile-page__edit-field">
                        <label className="profile-page__edit-label">{t('video.upload_tags')}</label>
                        <TagInput value={editTags} onChange={setEditTags} />
                    </div>

                    <div className="profile-page__edit-footer">
                        <Button type="button" variant="ghost" size="sm" onClick={handleEditClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" size="sm">
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ─── Edit profile modal ─── */}
            <Modal
                isOpen={editProfileOpen}
                onClose={() => setEditProfileOpen(false)}
                title={t('profile.edit_profile')}
                size="sm"
            >
                <form className="profile-page__edit-form" onSubmit={handleEditProfileSubmit}>
                    <Input
                        label={t('profile.name_label')}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder={t('profile.name_label')}
                    />
                    <div className="profile-page__edit-field">
                        <label className="profile-page__edit-label">{t('profile.bio_label')}</label>
                        <textarea
                            className="profile-page__edit-textarea"
                            value={editBio}
                            onChange={e => setEditBio(e.target.value)}
                            rows={3}
                            placeholder={t('profile.bio_placeholder')}
                        />
                    </div>
                    <div className="profile-page__edit-footer">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditProfileOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" size="sm">
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ─── UX-11: Delete confirmation modal ─── */}
            <Modal
                isOpen={videoToDelete !== null}
                onClose={handleDeleteCancel}
                title={t('video.delete')}
                size="sm"
                footer={
                    <div className="profile-page__edit-footer">
                        <Button type="button" variant="ghost" size="sm" onClick={handleDeleteCancel}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={handleDeleteConfirm}
                            leftIcon={<Trash2 size={13} />}
                        >
                            {t('video.delete')}
                        </Button>
                    </div>
                }
            >
                <p className="profile-page__delete-confirm-text">
                    {t('profile.delete_confirm', {
                        title: videoToDelete?.title ?? '',
                        defaultValue: 'Delete \'{{title}}\'? This cannot be undone.',
                    })}
                </p>
            </Modal>
        </div>
    );
}

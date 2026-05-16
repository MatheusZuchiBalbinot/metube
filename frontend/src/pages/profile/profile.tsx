import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Heart, Tag as TagIcon, Pencil, Upload, VideoOff, HeartOff, History, Pin, Trash2 } from 'lucide-react';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import { VideoFilter } from '@utils/applyFilters';
import { TagColors } from '@utils/tagColors';
import type { FilterState } from '@utils/applyFilters';
import type { Video, VideoId } from '@models/video';
import type { Tag } from '@models/tag';
import type { Uuid } from '@api';
import { channel as channelApi } from '@api';
import { useAppSelector } from '@store/index';
import type { VideoStatus } from '@models/video';
import { useAuth } from '@hooks/useAuth';
import { useVideo } from '@hooks/useVideo';
import { Avatar, Button, Input, Modal, Tooltip } from '@ui';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import EmptyState from '@ui/empty/empty';
import TagInput from '@components/tag/input';
import './profile.css';

const TAB = {
    VIDEOS: 'videos',
    LIKED: 'liked',
    HISTORY: 'history',
} as const;
type Tab = typeof TAB[keyof typeof TAB];

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

// eslint-disable-next-line complexity
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

    const [activeTab, setActiveTab] = useState<Tab>(TAB.VIDEOS);
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editTags, setEditTags] = useState<Tag[]>([]);

    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');

    // UX-11: delete confirmation state
    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

    const [ownVideos, setOwnVideos] = useState<Video[]>([]);
    const [loadingOwnVideos, setLoadingOwnVideos] = useState(true);
    const lastVideoStatusUpdate = useAppSelector(state => state.video.lastVideoStatusUpdate);
    const reduxVideosCount = useAppSelector(state => state.video.videos.length);
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const isInitial = !hasFetchedRef.current;
        if (isInitial) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoadingOwnVideos(true);
        }
        channelApi.videos(channelId as unknown as Uuid).then(result => {
            if (cancelled || !result) {
                return;
            }
            setOwnVideos(result.data);
        }).finally(() => {
            if (cancelled) {
                return;
            }
            hasFetchedRef.current = true;
            setLoadingOwnVideos(false);
        });
        return () => {
            cancelled = true;
        };
    }, [channelId, lastVideoStatusUpdate, reduxVideosCount]);

    useEffect(() => {
        // Optimistic local patch — applies WS status update instantly so the
        // user sees the badge change before the refetch lands.
        const hasUpdate = lastVideoStatusUpdate !== null && isOwnProfile;
        if (!hasUpdate) {
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOwnVideos(prev => prev.map(v =>
            v.id === (lastVideoStatusUpdate.vuid as unknown as typeof v.id)
                ? { ...v, status: lastVideoStatusUpdate.status as VideoStatus }
                : v,
        ));
    }, [lastVideoStatusUpdate, isOwnProfile]);

    const likedVideoList = useMemo(
        () => videos.filter((v: Video) => likedVideos.has(v.id)),
        [videos, likedVideos],
    );

    const historyVideoList = useMemo(
        () => watchHistory
            .map((id: string) => videos.find((v: Video) => v.id === (id as unknown as typeof v.id)))
            .filter((v): v is Video => v !== undefined),
        [watchHistory, videos],
    );

    const tabVideos = useMemo(() => {
        const isVideosTab = activeTab === TAB.VIDEOS;
        const isLikedTab = activeTab === TAB.LIKED;
        if (isVideosTab) {
            return ownVideos;
        }

        if (isLikedTab) {
            return likedVideoList;
        }

        return historyVideoList;
    }, [activeTab, ownVideos, likedVideoList, historyVideoList]);

    const allTags = useMemo(() => {
        const tagSet = new Set(tabVideos.flatMap((v: Video) => v.tags));
        return Array.from(tagSet).sort() as unknown as Tag[];
    }, [tabVideos]);

    const pinnedVideo = useMemo(
        () => (isOwnProfile && activeTab === TAB.VIDEOS && pinnedVideoId)
            ? videos.find(v => v.id === pinnedVideoId) ?? null
            : null,
        [isOwnProfile, activeTab, pinnedVideoId, videos],
    );

    const filteredVideos = useMemo(
        () => VideoFilter.apply(tabVideos, filterState).filter(v => v.id !== pinnedVideo?.id),
        [tabVideos, filterState, pinnedVideo],
    );

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

    function handleTabChange(tab: Tab) {
        setActiveTab(tab);
        setFilterState(VideoFilter.emptyState());
    }

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

    const tabs: { key: Tab; label: string }[] = [
        { key: TAB.VIDEOS, label: t('video.your_videos') },
        ...(isOwnProfile
            ? [
                { key: TAB.LIKED, label: t('video.liked_videos') },
                { key: TAB.HISTORY, label: t('video.watch_history') },
            ]
            : []),
    ];

    const hasVideos = filteredVideos.length > 0;

    let EmptyIcon;
    if (activeTab === TAB.LIKED) {
        EmptyIcon = HeartOff;
    } else if (activeTab === TAB.HISTORY) {
        EmptyIcon = History;
    } else {
        EmptyIcon = VideoOff;
    }

    let emptyTitle: string;
    if (activeTab === TAB.LIKED) {
        emptyTitle = t('video.no_results');
    } else if (activeTab === TAB.HISTORY) {
        emptyTitle = t('video.no_results');
    } else {
        emptyTitle = t('video.no_own_videos');
    }

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

            <div className="profile-page__tabs" role="tablist">
                {tabs.map(tab => (
                    <Button
                        key={tab.key}
                        role="tab"
                        variant="ghost"
                        className={['profile-page__tab', activeTab === tab.key ? 'profile-page__tab--active' : ''].filter(Boolean).join(' ')}
                        onClick={() => handleTabChange(tab.key)}
                        aria-selected={activeTab === tab.key}
                        aria-label={tab.label}
                    >
                        {tab.label}
                    </Button>
                ))}
            </div>

            <div className="profile-page__filters">
                <FilterPanel
                    allTags={allTags}
                    value={filterState}
                    onChange={setFilterState}
                />
            </div>

            <main className="profile-page__main">
                {loadingOwnVideos && activeTab === TAB.VIDEOS && (
                    <div className="profile-page__grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <VideoCardSkeleton key={i} />
                        ))}
                    </div>
                )}
                {!loadingOwnVideos && pinnedVideo && (
                    <div className="profile-page__pinned">
                        <div className="profile-page__pinned-header">
                            <Pin size={13} />
                            <span className="profile-page__pinned-label">{t('profile.pinned_video')}</span>
                        </div>
                        <div className="profile-page__pinned-card">
                            <VideoCard
                                video={pinnedVideo}
                                showActions={true}
                                onEdit={handleEditOpen}
                                onDelete={(id: VideoId) => {
                                    const video = ownVideos.find((v: Video) => v.id === id);
                                    const hasVideo = video !== undefined;
                                    if (hasVideo) {
                                        handleDeleteClick(video);
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}

                {!loadingOwnVideos && hasVideos && (
                    <div className="profile-page__grid">
                        {filteredVideos.map((video, i) => {
                            const isPinned = video.id === pinnedVideoId;
                            const isVideosTabOwn = isOwnProfile && activeTab === TAB.VIDEOS;
                            return (
                                <div key={video.id} className="profile-page__card-wrapper">
                                    {/* UX-12: pinned badge overlay */}
                                    {isPinned && isVideosTabOwn && (
                                        <div className="profile-page__pinned-badge" aria-label={t('video.pinned')}>
                                            <Pin size={10} />
                                            <span>{t('video.pinned')}</span>
                                        </div>
                                    )}
                                    <VideoCard
                                        video={video}
                                        index={i}
                                        showActions={isVideosTabOwn}
                                        onEdit={handleEditOpen}
                                        onDelete={(id: VideoId) => {
                                            const found = ownVideos.find((v: Video) => v.id === id);
                                            const hasFound = found !== undefined;
                                            if (hasFound) {
                                                handleDeleteClick(found);
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
                {!loadingOwnVideos && !hasVideos && (
                    <EmptyState
                        icon={<EmptyIcon size={36} strokeWidth={1.5} />}
                        title={emptyTitle}
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

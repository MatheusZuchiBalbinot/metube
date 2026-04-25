import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Heart, Tag as TagIcon, Flame, Pencil, Upload, VideoOff, HeartOff, History, Pin, Trash2 } from 'lucide-react';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import { VideoFilter } from '@utils/applyFilters';
import { TagColors } from '@utils/tagColors';
import type { FilterState } from '@utils/applyFilters';
import type { Video, VideoId } from '@models/video';
import type { Tag } from '@models/tag';
import type { Uuid } from '@api';
import { channel as channelApi } from '@api';
import { useAuth } from '@hooks/useAuth';
import { useVideo } from '@hooks/useVideo';
import { Avatar, Button, Input, Modal, Spinner, Tooltip } from '@ui';
import TagInput from '@components/tag/input';
import './profile.css';

const TAB = {
    VIDEOS: 'videos',
    LIKED: 'liked',
    HISTORY: 'history',
} as const;
type Tab = typeof TAB[keyof typeof TAB];

const HEATMAP_SHORT = 14;
const HEATMAP_LONG = 30;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function formatHeatmapDate(dateStr: string): string {
    const d = new Date(`${dateStr}T12:00:00Z`);
    return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// eslint-disable-next-line complexity
export default function ProfilePage() {
    const { t } = useTranslation();
    const { id: idParam } = useParams<{ id?: string }>();
    const { user, updateProfile } = useAuth();
    const {
        videos, watchHistory, watchEvents, likedVideos, videoProgress,
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

    // VISUAL-12: heatmap days toggle
    const [heatmapDays, setHeatmapDays] = useState(HEATMAP_SHORT);

    const [ownVideos, setOwnVideos] = useState<Video[]>([]);
    const [loadingOwnVideos, setLoadingOwnVideos] = useState(true);

    useEffect(() => {
        setLoadingOwnVideos(true);
        channelApi.videos(channelId as unknown as Uuid).then(result => {
            if (result) {
                setOwnVideos(result.data);
            }
        }).finally(() => setLoadingOwnVideos(false));
    }, [channelId]);

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

    // ─── Streak ───────────────────────────────────────────────────────────────
    const streak = useMemo(() => {
        const isNotOwn = !isOwnProfile;
        if (isNotOwn) {
            return 0;
        }

        const daySet = new Set(watchEvents.map((e: { date: string }) => e.date.slice(0, 10)));
        const today = new Date().toISOString().slice(0, 10);
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().slice(0, 10);

        const hasToday = daySet.has(today);
        const hasYesterday = daySet.has(yesterday);
        let startDay: string | null = null;
        if (hasToday) {
            startDay = today;
        } else if (hasYesterday) {
            startDay = yesterday;
        }
        const hasStartDay = startDay !== null;
        if (!hasStartDay) {
            return 0;
        }

        let count = 0;
        let current = new Date(`${startDay}T12:00:00Z`);
        while (daySet.has(current.toISOString().slice(0, 10))) {
            count++;
            current = new Date(current.getTime() - 86400000);
        }
        return count;
    }, [isOwnProfile, watchEvents]);

    // ─── Activity heatmap (configurable days) ─────────────────────────────────
    const activityData = useMemo(() => {
        const isNotOwn = !isOwnProfile;
        if (isNotOwn) {
            return null;
        }

        const eventsByDay = new Map<string, number>();
        for (const event of watchEvents) {
            const day = event.date.slice(0, 10);
            eventsByDay.set(day, (eventsByDay.get(day) ?? 0) + 1);
        }

        const now = new Date();
        const result: { key: string; dateLabel: string; count: number; pct: number }[] = [];
        const counts: number[] = [];

        for (let i = heatmapDays - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            counts.push(eventsByDay.get(key) ?? 0);
        }

        const maxCount = Math.max(...counts, 1);

        for (let i = heatmapDays - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const count = eventsByDay.get(key) ?? 0;
            result.push({
                key,
                dateLabel: formatHeatmapDate(key),
                count,
                pct: Math.round((count / maxCount) * 100),
            });
        }

        return result;
    }, [isOwnProfile, watchEvents, heatmapDays]);

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
                            {streak > 0 && (
                                <div className="profile-page__stat profile-page__stat--streak">
                                    <Flame size={13} className="profile-page__stat-icon profile-page__stat-icon--flame" />
                                    <span className="profile-page__stat-value">{streak}</span>
                                    <span className="profile-page__stat-label">{t('profile.day_streak')}</span>
                                </div>
                            )}
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

                    {/* VISUAL-12: heatmap with toggle, tooltip, and legend */}
                    {activityData && (
                        <div className="profile-page__heatmap-section">
                            <div className="profile-page__heatmap-controls" aria-label={t('profile.activity')}>
                                <span className="profile-page__heatmap-title">{t('profile.activity')}</span>
                                <div className="profile-page__heatmap-toggle" role="group">
                                    <button
                                        className={[
                                            'profile-page__heatmap-toggle-btn',
                                            heatmapDays === HEATMAP_SHORT ? 'profile-page__heatmap-toggle-btn--active' : '',
                                        ].filter(Boolean).join(' ')}
                                        onClick={() => setHeatmapDays(HEATMAP_SHORT)}
                                        aria-pressed={heatmapDays === HEATMAP_SHORT}
                                    >
                                        {t('profile.heatmap_14d', '14d')}
                                    </button>
                                    <button
                                        className={[
                                            'profile-page__heatmap-toggle-btn',
                                            heatmapDays === HEATMAP_LONG ? 'profile-page__heatmap-toggle-btn--active' : '',
                                        ].filter(Boolean).join(' ')}
                                        onClick={() => setHeatmapDays(HEATMAP_LONG)}
                                        aria-pressed={heatmapDays === HEATMAP_LONG}
                                    >
                                        {t('profile.heatmap_30d', '30d')}
                                    </button>
                                </div>
                            </div>
                            <div className="profile-page__activity" aria-label={t('profile.activity')}>
                                {activityData.map(({ key, dateLabel, count, pct }) => (
                                    <div
                                        key={key}
                                        className={['profile-page__activity-bar', pct > 0 ? 'profile-page__activity-bar--active' : ''].filter(Boolean).join(' ')}
                                        style={{ '--bar-h': `${pct}%` } as React.CSSProperties}
                                        title={`${dateLabel} · ${count} ${t('profile.heatmap_videos', 'videos')}`}
                                        aria-label={`${dateLabel}: ${count} ${t('profile.heatmap_videos', 'videos')}`}
                                        role="img"
                                    />
                                ))}
                            </div>
                            <div className="profile-page__heatmap-legend">
                                <span className="profile-page__heatmap-legend-label">{t('profile.heatmap_less', 'Less')}</span>
                                <div className="profile-page__heatmap-legend-swatches">
                                    {[0, 1, 2, 3, 4].map(n => (
                                        <span key={n} className={`profile-page__heatmap-swatch profile-page__heatmap-swatch--${n}`} />
                                    ))}
                                </div>
                                <span className="profile-page__heatmap-legend-label">{t('profile.heatmap_more', 'More')}</span>
                            </div>
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
                    <div className="profile-page__loading">
                        <Spinner />
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

                {!loadingOwnVideos && hasVideos ? (
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
                ) : !loadingOwnVideos ? (
                    <div className="profile-page__empty">
                        <EmptyIcon size={36} strokeWidth={1.5} className="profile-page__empty-icon" />
                        <p className="profile-page__empty-text">
                            {activeTab === TAB.VIDEOS && t('video.no_own_videos')}
                            {activeTab === TAB.LIKED && t('video.no_results')}
                            {activeTab === TAB.HISTORY && t('video.no_results')}
                        </p>
                    </div>
                ) : null}
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

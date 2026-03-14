import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Heart, Tag, Flame, Pencil, Upload, VideoOff, HeartOff, History, Pin } from 'lucide-react';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import { VideoFilter } from '@utils/applyFilters';
import { TagColors } from '@utils/tagColors';
import type { FilterState } from '@utils/applyFilters';
import type { Video } from '@data/mockVideos';
import { useAuth } from '@context/useAuth';
import { useVideo } from '@context/useVideo';
import { Avatar, Button, Input, Modal, Tooltip } from '@ui';
import TagInput from '@components/tag/input';
import './profile.css';

const TAB = {
    VIDEOS: 'videos',
    LIKED: 'liked',
    HISTORY: 'history',
} as const;
type Tab = typeof TAB[keyof typeof TAB];

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
    const [editTags, setEditTags] = useState<string[]>([]);

    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');

    const ownVideos = useMemo(
        () => videos.filter(v => v.channelId === channelId),
        [videos, channelId],
    );

    const likedVideoList = useMemo(
        () => videos.filter(v => likedVideos.has(v.id)),
        [videos, likedVideos],
    );

    const historyVideoList = useMemo(
        () => watchHistory
            .map(id => videos.find(v => v.id === id))
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
        const tagSet = new Set(tabVideos.flatMap(v => v.tags));
        return Array.from(tagSet).sort();
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

        let totalMinutes = 0;
        for (const id of watchHistory) {
            const pct = videoProgress[id] ?? 0;
            totalMinutes += Math.round((pct / 100) * 10);
        }

        const watchTimeStr = totalMinutes >= 60
            ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
            : `${totalMinutes}m`;

        const tagFreq = new Map<string, number>();
        for (const id of watchHistory) {
            const video = videos.find(v => v.id === id);
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

        const daySet = new Set(watchEvents.map(e => e.date.slice(0, 10)));
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

        const hasToday = daySet.has(today);
        const hasYesterday = daySet.has(yesterday);
        const startDay = hasToday ? today : (hasYesterday ? yesterday : null);
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

    // ─── Activity bars (last 14 days) ─────────────────────────────────────────
    const activityBars = useMemo(() => {
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
        const counts: number[] = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            counts.push(eventsByDay.get(key) ?? 0);
        }

        const maxCount = Math.max(...counts, 1);
        return counts.map(c => Math.round((c / maxCount) * 100));
    }, [isOwnProfile, watchEvents]);

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
        editVideo(editingVideo!.id, {
            title: editTitle.trim(),
            description: editDescription.trim(),
            tags: editTags,
        });
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

    const emptyIcon = activeTab === TAB.LIKED ? HeartOff
        : activeTab === TAB.HISTORY ? History
            : VideoOff;
    const EmptyIcon = emptyIcon;

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
                                    <Tag size={13} className="profile-page__stat-icon" />
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

                    {activityBars && (
                        <div className="profile-page__activity" aria-label={t('profile.activity')}>
                            {activityBars.map((pct, i) => (
                                <div
                                    key={i}
                                    className={['profile-page__activity-bar', pct > 0 ? 'profile-page__activity-bar--active' : ''].filter(Boolean).join(' ')}
                                    style={{ '--bar-h': `${pct}%` } as React.CSSProperties}
                                />
                            ))}
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
                {pinnedVideo && (
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
                                onDelete={deleteVideo}
                            />
                        </div>
                    </div>
                )}

                {hasVideos ? (
                    <div className="profile-page__grid">
                        {filteredVideos.map((video, i) => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                index={i}
                                showActions={isOwnProfile && activeTab === TAB.VIDEOS}
                                onEdit={handleEditOpen}
                                onDelete={deleteVideo}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="profile-page__empty">
                        <EmptyIcon size={36} strokeWidth={1.5} className="profile-page__empty-icon" />
                        <p className="profile-page__empty-text">
                            {activeTab === TAB.VIDEOS && t('video.no_own_videos')}
                            {activeTab === TAB.LIKED && t('video.no_results')}
                            {activeTab === TAB.HISTORY && t('video.no_results')}
                        </p>
                    </div>
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
        </div>
    );
}

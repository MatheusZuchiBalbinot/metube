import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import { VideoFilter } from '@utils/applyFilters';
import { TagColors } from '@utils/tagColors';
import type { FilterState } from '@utils/applyFilters';
import type { Video } from '@data/mockVideos';
import { useAuth } from '@context/useAuth';
import { useVideo } from '@context/useVideo';
import { Avatar, Button, Input, Modal } from '@ui';
import TagInput from '@components/tag/input';
import './profile.css';

const TAB = {
    VIDEOS:  'videos',
    LIKED:   'liked',
    HISTORY: 'history',
} as const;
type Tab = typeof TAB[keyof typeof TAB];

// eslint-disable-next-line complexity
export default function ProfilePage() {
    const { t } = useTranslation();
    const { id: idParam } = useParams<{ id?: string }>();
    const { user } = useAuth();
    const { videos, watchHistory, likedVideos, savedVideos, videoProgress, editVideo, deleteVideo } = useVideo();

    const isOwnProfile = !idParam || String(user!.id) === idParam;
    const channelId = isOwnProfile ? String(user!.id) : idParam!;

    const [activeTab, setActiveTab] = useState<Tab>(TAB.VIDEOS);
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);

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
        if (isVideosTab) { return ownVideos; }
        if (isLikedTab) { return likedVideoList; }
        return historyVideoList;
    }, [activeTab, ownVideos, likedVideoList, historyVideoList]);

    const allTags = useMemo(() => {
        const tagSet = new Set(tabVideos.flatMap(v => v.tags));
        return Array.from(tagSet).sort();
    }, [tabVideos]);

    const filteredVideos = useMemo(
        () => VideoFilter.apply(tabVideos, filterState),
        [tabVideos, filterState],
    );

    const channelName = isOwnProfile
        ? (user?.name ?? '')
        : (ownVideos[0]?.channel ?? idParam ?? '');

    // ─── Personal stats (own profile only) ────────────────────────────────────
    const stats = useMemo(() => {
        const isNotOwn = !isOwnProfile;
        if (isNotOwn) { return null; }

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
            if (!video) { continue; }
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
        if (hasTitleEmpty) { return; }
        editVideo(editingVideo!.id, {
            title: editTitle.trim(),
            description: editDescription.trim(),
            tags: editTags,
        });
        handleEditClose();
    }

    const tabs: { key: Tab; label: string }[] = [
        { key: TAB.VIDEOS, label: t('video.your_videos') },
        ...(isOwnProfile
            ? [
                { key: TAB.LIKED,   label: t('video.liked_videos') },
                { key: TAB.HISTORY, label: t('video.watch_history') },
            ]
            : []),
    ];

    const hasVideos = filteredVideos.length > 0;

    return (
        <div className="profile-page">
            <div className="profile-page__header">
                <div className="profile-page__avatar-section">
                    <Avatar name={channelName} size="lg" />
                </div>
                <div className="profile-page__info">
                    <h1 className="profile-page__name">{channelName}</h1>
                    <p className="profile-page__stats">
                        {ownVideos.length} {t('video.your_videos').toLowerCase()}
                    </p>
                    {stats && (
                        <div className="profile-page__stats-grid">
                            <div className="profile-page__stat">
                                <span className="profile-page__stat-value">{stats.videosWatched}</span>
                                <span className="profile-page__stat-label">{t('profile.videos_watched')}</span>
                            </div>
                            <div className="profile-page__stat">
                                <span className="profile-page__stat-value">{stats.watchTimeStr}</span>
                                <span className="profile-page__stat-label">{t('profile.watch_time')}</span>
                            </div>
                            <div className="profile-page__stat">
                                <span className="profile-page__stat-value">{stats.likedCount}</span>
                                <span className="profile-page__stat-label">{t('profile.liked_count')}</span>
                            </div>
                            {stats.topTags.length > 0 && (
                                <div className="profile-page__stat profile-page__stat--tags">
                                    <span className="profile-page__stat-label">{t('profile.top_tags')}</span>
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
                        className={`profile-page__tab${activeTab === tab.key ? ' profile-page__tab--active' : ''}`}
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
                {hasVideos ? (
                    <div className="profile-page__grid">
                        {filteredVideos.map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                showActions={isOwnProfile && activeTab === TAB.VIDEOS}
                                onEdit={handleEditOpen}
                                onDelete={deleteVideo}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="profile-page__empty">
                        <p className="profile-page__empty-text">
                            {activeTab === TAB.VIDEOS  && t('video.no_own_videos')}
                            {activeTab === TAB.LIKED   && t('video.no_results')}
                            {activeTab === TAB.HISTORY && t('video.no_results')}
                        </p>
                    </div>
                )}
            </main>

            <Modal
                isOpen={editingVideo !== null}
                onClose={handleEditClose}
                title={t('video.upload_title')}
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
        </div>
    );
}

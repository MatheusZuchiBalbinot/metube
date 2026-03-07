import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import { VideoFilter } from '@utils/applyFilters';
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

export default function ProfilePage() {
    const { t } = useTranslation();
    const { id: idParam } = useParams<{ id?: string }>();
    const { user } = useAuth();
    const { videos, watchHistory, likedVideos, editVideo, deleteVideo } = useVideo();

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

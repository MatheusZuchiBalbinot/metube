import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Upload } from 'lucide-react';
import FilterPanel from '@components/filter/panel';
import { domain } from '@domain';
import { Avatar, Button, Tooltip } from '@ui';
import './profile.css';
import { useAuth, useVideo, useProfileVideos } from '@hooks';
import { useAppSelector } from '@store';
import { selectWatchedTagFrequency } from '@store/videoSelectors';
import { VideoFilter, videoUrl, type FilterState } from '@utils';
import type { Video, Tag, VideoId } from '@models';
import { useEditVideoModal } from './hooks/useEditVideoModal';
import { useEditProfileModal } from './hooks/useEditProfileModal';
import { useDeleteVideoModal } from './hooks/useDeleteVideoModal';
import { useSpotlightComments } from './hooks/useSpotlightComments';
import { useProfileSections } from './hooks/useProfileSections';
import { useProfileStats } from './hooks/useProfileStats';
import EditVideoModal from './components/EditVideoModal';
import EditProfileModal from './components/EditProfileModal';
import DeleteVideoModal from './components/DeleteVideoModal';
import ProfileStats from './components/ProfileStats';
import ProfileSections from './components/ProfileSections';
import ProfileVideoGrid from './components/ProfileVideoGrid';

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

    const sections = useProfileSections(ownVideos, filterState, pinnedVideo);
    const stats = useProfileStats({ isOwnProfile, watchHistory, videoProgress, videos, likedVideos, watchedTagFrequency });
    const spotlightComments = useSpotlightComments(sections?.featured?.id ?? null);

    const navigateToVideo = useCallback(
        (id: VideoId) => navigate(videoUrl(id)),
        [navigate],
    );

    const handleDelete = useCallback(
        (id: VideoId) => handleDeleteById(id, ownVideos),
        [handleDeleteById, ownVideos],
    );

    function scrollToAllVideos(newFilter?: Partial<FilterState>) {
        if (newFilter) {
            setFilterState({ ...VideoFilter.emptyState(), ...newFilter });
        }

        setTimeout(() => {
            allVideosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    function handleCoverWatchClick(e: React.MouseEvent) {
        e.stopPropagation();
        const featuredVideoId = sections?.featured?.id;
        const hasFeaturedVideoId = featuredVideoId !== undefined;

        if (hasFeaturedVideoId) {
            navigate(videoUrl(featuredVideoId));
        }
    }

    const channelName = isOwnProfile
        ? (user?.name ?? '')
        : (ownVideos[0]?.channel ?? idParam ?? '');

    const profileBio = isOwnProfile ? (user?.bio ?? '') : '';
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
                <ProfileSections
                    sections={sections}
                    spotlightComments={spotlightComments}
                    isOwnProfile={isOwnProfile}
                    onNavigate={navigateToVideo}
                    onWatchClick={handleCoverWatchClick}
                    onScrollToFilter={scrollToAllVideos}
                    onEdit={handleEditOpen}
                    onDelete={handleDelete}
                />
            )}

            <ProfileVideoGrid
                isLoadingVideos={isLoadingVideos}
                hasCuratedSections={sections !== null}
                pinnedVideo={pinnedVideo}
                deckGhostVideos={deckGhostVideos}
                filteredVideos={filteredVideos}
                pinnedVideoId={pinnedVideoId}
                isOwnProfile={isOwnProfile}
                allVideosRef={allVideosRef}
                hasVideos={hasVideos}
                onEdit={handleEditOpen}
                onDelete={handleDelete}
            />

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

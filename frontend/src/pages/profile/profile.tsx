import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Upload } from 'lucide-react';
import FilterPanel from '@components/filter/panel';
import ProfileQuickFilters from './components/ProfileQuickFilters';
import { domain } from '@domain';
import { Avatar, Button, Tooltip } from '@ui';
import './profile.css';
import { useAuth, useVideo, useProfileVideos, useSubscription } from '@hooks';
import { useAppSelector, useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';
import { selectWatchedTagFrequency } from '@store/videoSelectors';
import { VideoFilter, videoUrl, cn, ROUTES, type FilterState } from '@utils';
import type { Video, Tag, VideoId, ChannelId } from '@models';
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
    const dispatch = useAppDispatch();
    const { isSubscribed, toggleSubscription } = useSubscription();
    const {
        videos, watchHistory, likedVideos, videoProgress,
        pinnedVideoId, editVideo, deleteVideo, openUploadModal,
    } = useVideo();

    const isOwnProfile = !idParam || user!.uuid === idParam;
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

    const draftVideos = useMemo(
        () => isOwnProfile ? ownVideos.filter(v => domain.video.isDraft(v)) : [],
        [isOwnProfile, ownVideos],
    );

    const filteredVideos = useMemo(
        () => VideoFilter.apply(ownVideos, filterState)
            .filter(v => v.id !== pinnedVideo?.id && !domain.video.isDraft(v)),
        [ownVideos, filterState, pinnedVideo],
    );

    const allVideosRef = useRef<HTMLDivElement>(null);
    const latestSectionRef = useRef<HTMLDivElement>(null);
    const mostViewedSectionRef = useRef<HTMLDivElement>(null);
    const topicSectionRef = useRef<HTMLDivElement>(null);
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

    const subscriptionChannelId = idParam as ChannelId | undefined;
    const isChannelSubscribed = subscriptionChannelId !== undefined && isSubscribed(subscriptionChannelId);

    function handleSubscribeToggle() {
        if (subscriptionChannelId === undefined) {
            return;
        }

        toggleSubscription(subscriptionChannelId);
        dispatch(toastActions.addToast({
            message: t(isChannelSubscribed ? 'toast.unsubscribed' : 'toast.subscribed'),
            type: ToastType.SUCCESS,
        }));
    }

    const shouldRedirectToOwnProfile = idParam !== undefined && isOwnProfile;

    if (shouldRedirectToOwnProfile) {
        return <Navigate to={ROUTES.PROFILE} replace />;
    }

    return (
        <div className="profile-page">
            <div className="profile-page__banner" aria-hidden="true" />

            <div className="profile-page__container">
                <div className="profile-page__header">
                    <div className="profile-page__avatar-section">
                        <Avatar name={channelName} size="lg" />
                    </div>
                    <div className="profile-page__info">
                        <div className="profile-page__name-row">
                            <h1 className="profile-page__name">{channelName}</h1>
                            {!isOwnProfile && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-pressed={isChannelSubscribed}
                                    className={cn('profile-page__subscribe-btn', isChannelSubscribed && 'profile-page__subscribe-btn--subscribed')}
                                    onClick={handleSubscribeToggle}
                                >
                                    {isChannelSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
                                </Button>
                            )}
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
                    <ProfileQuickFilters
                        allTags={allTags}
                        value={filterState}
                        onChange={setFilterState}
                        onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        onScrollToTrending={() => mostViewedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        onScrollToRecent={() => latestSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        onScrollToTopic={() => topicSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    />
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
                        latestRef={latestSectionRef}
                        mostViewedRef={mostViewedSectionRef}
                        topicRef={topicSectionRef}
                    />
                )}

                <ProfileVideoGrid
                    isLoadingVideos={isLoadingVideos}
                    hasCuratedSections={sections !== null}
                    pinnedVideo={pinnedVideo}
                    deckGhostVideos={deckGhostVideos}
                    filteredVideos={filteredVideos}
                    draftVideos={draftVideos}
                    pinnedVideoId={pinnedVideoId}
                    isOwnProfile={isOwnProfile}
                    allVideosRef={allVideosRef}
                    hasVideos={hasVideos}
                    onEdit={handleEditOpen}
                    onDelete={handleDelete}
                />

            </div>{/* .profile-page__container */}

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

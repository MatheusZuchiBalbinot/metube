import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Upload, Eye, EyeOff } from '@components/icons/icons';
import FilterPanel from '@components/filter/panel';
import ProfileQuickFilters from './components/ProfileQuickFilters';
import { domain } from '@domain';
import { Avatar, Button } from '@ui';
import './profile.css';
import { useAuth, useVideo, useProfileVideos, useSubscription, useAllTags } from '@hooks';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';
import { recentChannelsActions } from '@store/recentChannelsSlice';
import { VideoFilter, videoUrl, ROUTES, TagColors, type FilterState } from '@utils';
import type { VideoId, ChannelId, Tag } from '@models';
import { useEditVideoModal } from './hooks/useEditVideoModal';
import { useEditProfileModal } from './hooks/useEditProfileModal';
import { useDeleteVideoModal } from './hooks/useDeleteVideoModal';
import { useSpotlightComments } from './hooks/useSpotlightComments';
import { useProfileSections, type TagSection } from './hooks/useProfileSections';
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
        pinnedVideoId, editVideo, deleteVideo, openUploadModal,
    } = useVideo();

    // ProfilePage is also a guest route (/channel/:id, /user/:id), so `user` can be
    // null here — a logged-out visitor is never viewing their own profile.
    const isOwnProfile = user !== null && (!idParam || user.uuid === idParam);
    const channelId = isOwnProfile && user !== null ? String(user.id) : (idParam ?? '');

    // Only swaps what gets *displayed*; data-fetching/routing (channelId, refetch,
    // own-profile redirect) still keys off the untouched isOwnProfile.
    const [previewAsVisitor, setPreviewAsVisitor] = useState(false);
    const isPreviewingAsVisitor = isOwnProfile && previewAsVisitor;
    const displayIsOwnProfile = isOwnProfile && !previewAsVisitor;

    const { videosState, setVideos } = useProfileVideos(channelId, isOwnProfile);
    const ownVideos = videosState.kind === 'ok' ? videosState.data : [];
    const isLoadingVideos = videosState.kind === 'loading';

    // Track visits to other users' channels so the sidebar can surface them.
    useEffect(() => {
        if (isOwnProfile) {
            return;
        }

        const channelName = ownVideos[0]?.channel;
        const isMissingData = !channelName || !idParam;
        if (isMissingData) {
            return;
        }

        dispatch(recentChannelsActions.recordChannelVisit({ uuid: idParam, name: channelName }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOwnProfile, idParam, ownVideos]);

    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);

    // "By topic" swaps the grid for a topic-picker gallery instead of sorting it —
    // there's no meaningful "sort by topic" order. Any other filter change backs out of it.
    const [showTopicView, setShowTopicView] = useState(false);

    function handleFilterChange(next: FilterState) {
        setShowTopicView(false);
        setFilterState(next);
    }

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

    const allTags = useAllTags(ownVideos);

    // Reads from ownVideos, not the global `videos` Redux store — that only ever
    // holds a handful of videos (bootstrap + this session's uploads), so most
    // channels' pinned video would resolve to null or a stale copy there.
    const pinnedVideo = useMemo(
        () => (displayIsOwnProfile && pinnedVideoId)
            ? ownVideos.find(v => v.id === pinnedVideoId) ?? null
            : null,
        [displayIsOwnProfile, pinnedVideoId, ownVideos],
    );

    const deckGhostVideos = useMemo(() => {
        const isNotOwn = !displayIsOwnProfile;
        const hasNoPinned = pinnedVideo === null;

        if (isNotOwn || hasNoPinned) {
            return [];
        }

        return ownVideos
            .filter(v => domain.video.isPublished(v) && v.id !== pinnedVideo.id)
            .sort((a, b) => b.views - a.views)
            .slice(0, 2);
    }, [displayIsOwnProfile, pinnedVideo, ownVideos]);

    // Draft/scheduled/processing/failed are grouped as "not yet live" so the main
    // grid below only ever holds videos a visitor could actually watch.
    const nonLiveVideos = useMemo(
        () => displayIsOwnProfile ? ownVideos.filter(v => !domain.video.isVisible(v)) : [],
        [displayIsOwnProfile, ownVideos],
    );

    const hasNonLiveVideos = nonLiveVideos.length > 0;

    const filteredVideos = useMemo(
        () => VideoFilter.apply(ownVideos, filterState)
            .filter(v => v.id !== pinnedVideo?.id && domain.video.isVisible(v)),
        [ownVideos, filterState, pinnedVideo],
    );

    // Independent of useProfileSections' curated tagSections (which need 5+ published
    // videos) — this groups every tag on every visible video so the topic gallery
    // works for any profile size.
    const topicSections = useMemo<TagSection[]>(() => {
        const visibleVideos = ownVideos.filter(v => domain.video.isVisible(v));
        const tagCounts = new Map<Tag, number>();

        for (const video of visibleVideos) {
            for (const tag of video.tags) {
                const isShorts = tag === 'shorts';
                if (isShorts) {
                    continue;
                }
                tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
        }

        return [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => ({
                tag,
                count,
                videos: visibleVideos
                    .filter(v => v.tags.includes(tag))
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 3),
            }));
    }, [ownVideos]);

    function handleSelectTopic(tag: Tag) {
        setShowTopicView(false);
        setFilterState({ ...VideoFilter.emptyState(), tags: [tag] });
    }

    const allVideosRef = useRef<HTMLDivElement>(null);
    const nonLiveRef = useRef<HTMLDivElement>(null);
    const latestSectionRef = useRef<HTMLDivElement>(null);
    const mostViewedSectionRef = useRef<HTMLDivElement>(null);
    const topicSectionRef = useRef<HTMLDivElement>(null);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const sections = useProfileSections(ownVideos, filterState, pinnedVideo);
    const stats = useProfileStats({ isOwnProfile: displayIsOwnProfile, videos: ownVideos });
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

    // The curated layout already has its own topic gallery — scroll to it instead of
    // showing a second, differently-computed one. Everyone else gets topicSections below.
    function handleShowTopics() {
        const hasCuratedTopicGallery = topicSectionRef.current !== null;

        if (hasCuratedTopicGallery) {
            topicSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        setShowTopicView(true);
        filterPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function handleToggleTopicView() {
        if (showTopicView) {
            setShowTopicView(false);
            return;
        }

        handleShowTopics();
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

    // A genuine visitor's ownVideos is already scoped server-side to what they can
    // see — only the previewing-owner case needs a client-side recount, since their
    // own fetch legitimately includes drafts/scheduled/etc.
    const videosCount = isPreviewingAsVisitor
        ? ownVideos.filter(v => domain.video.isVisible(v)).length
        : ownVideos.length;

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
            {/* Must stay above the cover: the header's avatar overlaps it with a negative
                margin, which would otherwise eat this banner if placed any closer. */}
            {isPreviewingAsVisitor && (
                <div className="profile-page__preview-banner">
                    <Eye size={14} />
                    <span>{t('profile.previewing_banner')}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewAsVisitor(false)}
                        className="profile-page__preview-exit"
                    >
                        {t('profile.exit_preview')}
                    </Button>
                </div>
            )}

            <div className="profile-page__banner" aria-hidden="true" />

            <div className="profile-page__container">

                <div className="profile-page__header">
                    <div className="profile-page__avatar-section">
                        <Avatar name={channelName} size="lg" />
                    </div>
                    <div className="profile-page__info">
                        <div className="profile-page__name-row">
                            <h1 className="profile-page__name">{channelName}</h1>
                        </div>

                        <p className="profile-page__subtitle">
                            {t('video.videos_count', { count: videosCount })}
                            {displayIsOwnProfile && stats && (
                                <>
                                    <span className="profile-page__subtitle-dot" aria-hidden="true">·</span>
                                    {stats.subscriberCount} {t('channel.subscribers')}
                                </>
                            )}
                        </p>

                        {profileBio && (
                            <p className="profile-page__bio">{profileBio}</p>
                        )}
                    </div>

                    {(isOwnProfile || !displayIsOwnProfile) && (
                        <div className="profile-page__header-actions">
                            {!displayIsOwnProfile && (
                                <Button
                                    variant={isChannelSubscribed ? 'secondary' : 'primary'}
                                    size="md"
                                    aria-pressed={isChannelSubscribed}
                                    className="profile-page__header-btn"
                                    onClick={handleSubscribeToggle}
                                >
                                    {isChannelSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
                                </Button>
                            )}
                            {isOwnProfile && !previewAsVisitor && (
                                <>
                                    <Button
                                        variant="primary"
                                        size="md"
                                        leftIcon={<Upload size={15} />}
                                        className="profile-page__header-btn"
                                        onClick={() => openUploadModal()}
                                    >
                                        {t('video.upload')}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        leftIcon={<Pencil size={15} />}
                                        className="profile-page__header-btn"
                                        onClick={() => handleEditProfileOpen(user?.name ?? '', user?.bio ?? '')}
                                    >
                                        {t('profile.edit_profile')}
                                    </Button>
                                </>
                            )}
                            {isOwnProfile && (
                                <Button
                                    variant="secondary"
                                    size="md"
                                    aria-pressed={previewAsVisitor}
                                    leftIcon={previewAsVisitor ? <EyeOff size={15} /> : <Eye size={15} />}
                                    className="profile-page__header-btn"
                                    onClick={() => setPreviewAsVisitor(v => !v)}
                                >
                                    {t(previewAsVisitor ? 'profile.exit_preview' : 'profile.preview_as_visitor')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {displayIsOwnProfile && stats && <ProfileStats stats={stats} />}

                {displayIsOwnProfile && stats && stats.topTags.length > 0 && (
                    <div className="profile-page__topics-row">
                        <span className="profile-page__topics-label">{t('profile.top_tags')}</span>
                        <div className="profile-page__top-tags">
                            {stats.topTags.map(tag => {
                                const palette = TagColors.palette(tag);
                                return (
                                    <span
                                        key={tag}
                                        className="profile-page__top-tag"
                                        style={{ background: palette.bg, color: palette.color }}
                                    >
                                        {tag}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {hasNonLiveVideos && (
                    <div className="profile-page__tabs" role="tablist" aria-label={t('profile.tab_videos')}>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={true}
                            className="profile-page__tab profile-page__tab--active"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            <span className="profile-page__tab-label">{t('profile.tab_videos')}</span>
                            <span className="profile-page__tab-count">{ownVideos.length - nonLiveVideos.length}</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={false}
                            className="profile-page__tab"
                            onClick={() => nonLiveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        >
                            <span className="profile-page__tab-label">{t('profile.tab_not_published')}</span>
                            <span className="profile-page__tab-count">{nonLiveVideos.length}</span>
                        </button>
                    </div>
                )}

                <div className="profile-page__filters">
                    <ProfileQuickFilters
                        value={filterState}
                        onChange={handleFilterChange}
                        isTopicViewActive={showTopicView}
                        onScrollToTrending={() => mostViewedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        onScrollToRecent={() => latestSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        onToggleTopicView={handleToggleTopicView}
                    />

                    <div ref={filterPanelRef}>
                        <FilterPanel
                            allTags={allTags}
                            value={filterState}
                            onChange={handleFilterChange}
                            hideSort
                        />
                    </div>
                </div>

                {sections !== null && !isLoadingVideos && (
                    <ProfileSections
                        sections={sections}
                        spotlightComments={spotlightComments}
                        isOwnProfile={displayIsOwnProfile}
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
                    nonLiveVideos={nonLiveVideos}
                    pinnedVideoId={pinnedVideoId}
                    isOwnProfile={displayIsOwnProfile}
                    allVideosRef={allVideosRef}
                    nonLiveRef={nonLiveRef}
                    hasVideos={hasVideos}
                    showTopicView={showTopicView}
                    topicSections={topicSections}
                    totalViews={displayIsOwnProfile && stats ? stats.totalViews : null}
                    onSelectTopic={handleSelectTopic}
                    onEdit={handleEditOpen}
                    onDelete={handleDelete}
                    onRetry={() => openUploadModal()}
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

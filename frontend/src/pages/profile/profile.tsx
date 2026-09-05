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
import { recentChannelsActions } from '@store/recentChannelsSlice';
import { VideoFilter, videoUrl, ROUTES, TagColors, type FilterState } from '@utils';
import type { VideoId, ChannelId, Tag, User, Video } from '@models';
import { useEditVideoModal } from './hooks/useEditVideoModal';
import { useEditProfileModal } from './hooks/useEditProfileModal';
import { useDeleteVideoModal } from './hooks/useDeleteVideoModal';
import { useSpotlightComments } from './hooks/useSpotlightComments';
import { useProfileSections, type TagSection, type ProfileSectionsData } from './hooks/useProfileSections';
import { useProfileStats, type ProfileStats as ProfileStatsData } from './hooks/useProfileStats';
import EditVideoModal from './components/EditVideoModal';
import EditProfileModal from './components/EditProfileModal';
import DeleteVideoModal from './components/DeleteVideoModal';
import ProfileStats from './components/ProfileStats';
import ProfileSections from './components/ProfileSections';
import ProfileVideoGrid from './components/ProfileVideoGrid';

// Extracted so the ownership-check branches don't count toward ProfilePage's own
// complexity. ProfilePage is also a guest route (/channel/:id, /user/:id), so `user`
// can be null here — a logged-out visitor is never viewing their own profile.
function resolveIsOwnProfile(user: User | null, idParam: string | undefined): boolean {
    return user !== null && (!idParam || user.uuid === idParam);
}

function resolveChannelId(isOwnProfile: boolean, user: User | null, idParam: string | undefined): string {
    return isOwnProfile && user !== null ? String(user.id) : (idParam ?? '');
}

function resolveChannelName(
    isOwnProfile: boolean,
    user: User | null,
    ownVideos: Video[],
    idParam: string | undefined,
): string {
    return isOwnProfile ? (user?.name ?? '') : (ownVideos[0]?.channel ?? idParam ?? '');
}

function resolveProfileBio(isOwnProfile: boolean, user: User | null): string {
    return isOwnProfile ? (user?.bio ?? '') : '';
}

// A genuine visitor's ownVideos is already scoped server-side to what they can
// see — only the previewing-owner case needs a client-side recount, since their
// own fetch legitimately includes drafts/scheduled/etc.
function resolveVideosCount(isPreviewingAsVisitor: boolean, ownVideos: Video[]): number {
    return isPreviewingAsVisitor
        ? ownVideos.filter(v => domain.video.isVisible(v)).length
        : ownVideos.length;
}

function resolveTotalViews(displayIsOwnProfile: boolean, stats: ProfileStatsData | null): number | null {
    return displayIsOwnProfile && stats ? stats.totalViews : null;
}

function resolveIsChannelSubscribed(
    subscriptionChannelId: ChannelId | undefined,
    isSubscribed: (id: ChannelId) => boolean,
): boolean {
    return subscriptionChannelId !== undefined && isSubscribed(subscriptionChannelId);
}

function shouldRedirectToOwnProfile(idParam: string | undefined, isOwnProfile: boolean): boolean {
    return idParam !== undefined && isOwnProfile;
}

interface ProfilePreviewBannerProps {
    show: boolean
    onExit: () => void
}

function ProfilePreviewBanner({ show, onExit }: ProfilePreviewBannerProps) {
    const { t } = useTranslation();

    if (!show) {
        return null;
    }

    return (
        // Must stay above the cover: the header's avatar overlaps it with a negative
        // margin, which would otherwise eat this banner if placed any closer.
        <div className="profile-page__preview-banner">
            <Eye size={14} />
            <span>{t('profile.previewing_banner')}</span>
            <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                className="profile-page__preview-exit"
            >
                {t('profile.exit_preview')}
            </Button>
        </div>
    );
}

interface ProfileSubtitleProps {
    videosCount: number
    displayIsOwnProfile: boolean
    stats: ProfileStatsData | null
}

function ProfileSubtitle({ videosCount, displayIsOwnProfile, stats }: ProfileSubtitleProps) {
    const { t } = useTranslation();

    return (
        <p className="profile-page__subtitle">
            {t('video.videos_count', { count: videosCount })}
            {displayIsOwnProfile && stats && (
                <>
                    <span className="profile-page__subtitle-dot" aria-hidden="true">·</span>
                    {stats.subscriberCount} {t('channel.subscribers')}
                </>
            )}
        </p>
    );
}

interface ProfileHeaderActionsProps {
    isOwnProfile: boolean
    displayIsOwnProfile: boolean
    previewAsVisitor: boolean
    isChannelSubscribed: boolean
    user: User | null
    onSubscribeToggle: () => void
    onOpenUpload: () => void
    onEditProfileOpen: (name: string, bio: string) => void
    onTogglePreview: () => void
}

interface SubscribeButtonProps {
    show: boolean
    isChannelSubscribed: boolean
    onSubscribeToggle: () => void
}

function SubscribeButton({ show, isChannelSubscribed, onSubscribeToggle }: SubscribeButtonProps) {
    const { t } = useTranslation();

    if (!show) {
        return null;
    }

    return (
        <Button
            variant={isChannelSubscribed ? 'secondary' : 'primary'}
            size="md"
            aria-pressed={isChannelSubscribed}
            className="profile-page__header-btn"
            onClick={onSubscribeToggle}
        >
            {isChannelSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
        </Button>
    );
}

interface OwnerUploadEditButtonsProps {
    show: boolean
    user: User | null
    onOpenUpload: () => void
    onEditProfileOpen: (name: string, bio: string) => void
}

function OwnerUploadEditButtons({ show, user, onOpenUpload, onEditProfileOpen }: OwnerUploadEditButtonsProps) {
    const { t } = useTranslation();

    if (!show) {
        return null;
    }

    return (
        <>
            <Button
                variant="primary"
                size="md"
                leftIcon={<Upload size={15} />}
                className="profile-page__header-btn"
                onClick={onOpenUpload}
            >
                {t('video.upload')}
            </Button>
            <Button
                variant="secondary"
                size="md"
                leftIcon={<Pencil size={15} />}
                className="profile-page__header-btn"
                onClick={() => onEditProfileOpen(user?.name ?? '', user?.bio ?? '')}
            >
                {t('profile.edit_profile')}
            </Button>
        </>
    );
}

interface PreviewToggleButtonProps {
    show: boolean
    previewAsVisitor: boolean
    onTogglePreview: () => void
}

function PreviewToggleButton({ show, previewAsVisitor, onTogglePreview }: PreviewToggleButtonProps) {
    const { t } = useTranslation();

    if (!show) {
        return null;
    }

    return (
        <Button
            variant="secondary"
            size="md"
            aria-pressed={previewAsVisitor}
            leftIcon={previewAsVisitor ? <EyeOff size={15} /> : <Eye size={15} />}
            className="profile-page__header-btn"
            onClick={onTogglePreview}
        >
            {t(previewAsVisitor ? 'profile.exit_preview' : 'profile.preview_as_visitor')}
        </Button>
    );
}

function ProfileHeaderActions({
    isOwnProfile, displayIsOwnProfile, previewAsVisitor, isChannelSubscribed, user,
    onSubscribeToggle, onOpenUpload, onEditProfileOpen, onTogglePreview,
}: ProfileHeaderActionsProps) {
    const show = isOwnProfile || !displayIsOwnProfile;

    if (!show) {
        return null;
    }

    return (
        <div className="profile-page__header-actions">
            <SubscribeButton
                show={!displayIsOwnProfile}
                isChannelSubscribed={isChannelSubscribed}
                onSubscribeToggle={onSubscribeToggle}
            />
            <OwnerUploadEditButtons
                show={isOwnProfile && !previewAsVisitor}
                user={user}
                onOpenUpload={onOpenUpload}
                onEditProfileOpen={onEditProfileOpen}
            />
            <PreviewToggleButton
                show={isOwnProfile}
                previewAsVisitor={previewAsVisitor}
                onTogglePreview={onTogglePreview}
            />
        </div>
    );
}

interface ProfileTopTagsRowProps {
    displayIsOwnProfile: boolean
    stats: ProfileStatsData | null
}

function ProfileTopTagsRow({ displayIsOwnProfile, stats }: ProfileTopTagsRowProps) {
    const { t } = useTranslation();

    if (!displayIsOwnProfile || !stats || stats.topTags.length === 0) {
        return null;
    }

    return (
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
    );
}

interface ProfileTabsBarProps {
    show: boolean
    ownVideosCount: number
    nonLiveVideos: Video[]
    nonLiveRef: React.RefObject<HTMLDivElement | null>
}

function ProfileTabsBar({ show, ownVideosCount, nonLiveVideos, nonLiveRef }: ProfileTabsBarProps) {
    const { t } = useTranslation();

    if (!show) {
        return null;
    }

    return (
        <div className="profile-page__tabs" role="tablist" aria-label={t('profile.tab_videos')}>
            <button
                type="button"
                role="tab"
                aria-selected={true}
                className="profile-page__tab profile-page__tab--active"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
                <span className="profile-page__tab-label">{t('profile.tab_videos')}</span>
                <span className="profile-page__tab-count">{ownVideosCount - nonLiveVideos.length}</span>
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
    );
}

interface ProfileCuratedSectionsProps {
    show: boolean
    sections: ProfileSectionsData | null
    spotlightComments: ReturnType<typeof useSpotlightComments>
    isOwnProfile: boolean
    onNavigate: (id: VideoId) => void
    onWatchClick: (e: React.MouseEvent) => void
    onScrollToFilter: (newFilter?: Partial<FilterState>) => void
    onEdit: (video: Video) => void
    onDelete: (id: VideoId) => void
    latestRef: React.RefObject<HTMLDivElement | null>
    mostViewedRef: React.RefObject<HTMLDivElement | null>
    topicRef: React.RefObject<HTMLDivElement | null>
}

function ProfileCuratedSections({ show, sections, ...rest }: ProfileCuratedSectionsProps) {
    if (!show || sections === null) {
        return null;
    }

    return <ProfileSections sections={sections} {...rest} />;
}

interface ProfileStatsSectionProps {
    displayIsOwnProfile: boolean
    stats: ProfileStatsData | null
}

function ProfileStatsSection({ displayIsOwnProfile, stats }: ProfileStatsSectionProps) {
    if (!displayIsOwnProfile || !stats) {
        return null;
    }

    return <ProfileStats stats={stats} />;
}

export default function ProfilePage() {
    const { id: idParam } = useParams<{ id?: string }>();
    const { user, updateProfile } = useAuth();
    const dispatch = useAppDispatch();
    const { isSubscribed, toggleSubscription } = useSubscription();
    const {
        pinnedVideoId, editVideo, deleteVideo, openUploadModal,
    } = useVideo();

    const isOwnProfile = resolveIsOwnProfile(user, idParam);
    const channelId = resolveChannelId(isOwnProfile, user, idParam);

    // Only swaps what gets *displayed*; data-fetching/routing (channelId, refetch,
    // own-profile redirect) still keys off the untouched isOwnProfile.
    const [previewAsVisitor, setPreviewAsVisitor] = useState(false);
    const isPreviewingAsVisitor = isOwnProfile && previewAsVisitor;
    const displayIsOwnProfile = isOwnProfile && !previewAsVisitor;

    const { videosState, setVideos } = useProfileVideos(channelId, isOwnProfile);
    const ownVideos = useMemo(
        () => videosState.kind === 'ok' ? videosState.data : [],
        [videosState],
    );
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

    const channelName = resolveChannelName(isOwnProfile, user, ownVideos, idParam);
    const profileBio = resolveProfileBio(isOwnProfile, user);
    const hasVideos = filteredVideos.length > 0;
    const videosCount = resolveVideosCount(isPreviewingAsVisitor, ownVideos);

    const subscriptionChannelId = idParam as ChannelId | undefined;
    const isChannelSubscribed = resolveIsChannelSubscribed(subscriptionChannelId, isSubscribed);

    function handleSubscribeToggle() {
        if (subscriptionChannelId === undefined) {
            return;
        }

        // toggleSubscription (useSubscription) already shows the
        // subscribed/unsubscribed toast itself once the server confirms it —
        // showing a second one here duplicated it for every click.
        toggleSubscription(subscriptionChannelId);
    }

    if (shouldRedirectToOwnProfile(idParam, isOwnProfile)) {
        return <Navigate to={ROUTES.PROFILE} replace />;
    }

    return (
        <div className="profile-page">
            <ProfilePreviewBanner show={isPreviewingAsVisitor} onExit={() => setPreviewAsVisitor(false)} />

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

                        <ProfileSubtitle videosCount={videosCount} displayIsOwnProfile={displayIsOwnProfile} stats={stats} />

                        {profileBio && (
                            <p className="profile-page__bio">{profileBio}</p>
                        )}
                    </div>

                    <ProfileHeaderActions
                        isOwnProfile={isOwnProfile}
                        displayIsOwnProfile={displayIsOwnProfile}
                        previewAsVisitor={previewAsVisitor}
                        isChannelSubscribed={isChannelSubscribed}
                        user={user}
                        onSubscribeToggle={handleSubscribeToggle}
                        onOpenUpload={() => openUploadModal()}
                        onEditProfileOpen={handleEditProfileOpen}
                        onTogglePreview={() => setPreviewAsVisitor(v => !v)}
                    />
                </div>

                <ProfileStatsSection displayIsOwnProfile={displayIsOwnProfile} stats={stats} />

                <ProfileTopTagsRow displayIsOwnProfile={displayIsOwnProfile} stats={stats} />

                <ProfileTabsBar
                    show={hasNonLiveVideos}
                    ownVideosCount={ownVideos.length}
                    nonLiveVideos={nonLiveVideos}
                    nonLiveRef={nonLiveRef}
                />

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

                <ProfileCuratedSections
                    show={!isLoadingVideos}
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
                    totalViews={resolveTotalViews(displayIsOwnProfile, stats)}
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

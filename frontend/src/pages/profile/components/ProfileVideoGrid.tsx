import { Play, Pin, VideoOff, Hash } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import VideoCard from '@components/video/card';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import EmptyState from '@ui/empty/empty';
import Badge, { type BadgeVariant } from '@ui/badge/badge';
import Button from '@ui/button/button';
import ProfileTopicGrid from './ProfileTopicGrid';
import { domain } from '@domain';
import { Format, formatDuration, formatRelativeDate, videoUrl, isActivationKey, cn } from '@utils';
import type { TagSection } from '../hooks/useProfileSections';
import type { Video, VideoId, Tag } from '@models';

interface ProfileVideoGridProps {
    isLoadingVideos: boolean
    hasCuratedSections: boolean
    pinnedVideo: Video | null
    deckGhostVideos: Video[]
    filteredVideos: Video[]
    nonLiveVideos: Video[]
    pinnedVideoId: VideoId | null | undefined
    isOwnProfile: boolean
    allVideosRef: React.RefObject<HTMLDivElement | null>
    nonLiveRef: React.RefObject<HTMLDivElement | null>
    hasVideos: boolean
    showTopicView: boolean
    topicSections: TagSection[]
    totalViews: number | null
    onSelectTopic: (tag: Tag) => void
    onEdit: (video: Video) => void
    onDelete: (id: VideoId) => void
    onRetry: () => void
}

interface NonLiveStatus {
    variant: BadgeVariant
    label: string
}

function useNonLiveStatus(video: Video): NonLiveStatus {
    const { t } = useTranslation();

    if (domain.video.isProcessing(video)) {
        return { variant: 'default', label: t('video.processing') };
    }

    if (domain.video.isFailed(video)) {
        return { variant: 'danger', label: t('video.failed') };
    }

    if (domain.video.isScheduledAndFuture(video)) {
        return { variant: 'warning', label: t('video.scheduled') };
    }

    return { variant: 'neutral', label: t('video.draft') };
}

interface NonLiveRowProps {
    video: Video
    onEdit: (video: Video) => void
    onRetry: () => void
}

interface NonLiveThumbProps {
    video: Video
}

// Extracted so the thumbnail/duration conditionals don't count toward NonLiveRow's
// own complexity — same markup as before.
function NonLiveThumb({ video }: NonLiveThumbProps) {
    const hasDuration = video.duration !== undefined && video.duration > 0;

    return (
        <div className="profile-nonlive-row__thumb">
            {video.thumbnail && <img src={video.thumbnail} alt="" />}
            {hasDuration && (
                <span className="profile-nonlive-row__duration">{formatDuration(video.duration)}</span>
            )}
        </div>
    );
}

interface NonLiveActionsProps {
    video: Video
    isFailed: boolean
    onEdit: (video: Video) => void
    onRetry: () => void
}

function NonLiveActions({ video, isFailed, onEdit, onRetry }: NonLiveActionsProps) {
    const { t } = useTranslation();

    function handleEditClick(e: React.MouseEvent) {
        e.stopPropagation();
        onEdit(video);
    }

    function handleRetryClick(e: React.MouseEvent) {
        e.stopPropagation();
        onRetry();
    }

    return (
        <div className="profile-nonlive-row__actions">
            <Button variant="secondary" size="sm" onClick={handleEditClick}>{t('video.edit')}</Button>
            {isFailed && (
                <Button variant="secondary" size="sm" onClick={handleRetryClick}>{t('video.retry_upload')}</Button>
            )}
        </div>
    );
}

// Denser list-style row instead of the full VideoCard grid. Only processing/failed
// are inert (nothing to watch yet); draft/scheduled still open normally.
function NonLiveRow({ video, onEdit, onRetry }: NonLiveRowProps) {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const status = useNonLiveStatus(video);
    const isFailed = domain.video.isFailed(video);
    const isNotInteractive = domain.video.isProcessing(video) || isFailed;
    const hasTags = video.tags.length > 0;

    function handleRowClick() {
        if (isNotInteractive) {
            return;
        }
        navigate(videoUrl(video.id));
    }

    function handleRowKeyDown(e: React.KeyboardEvent) {
        if (isNotInteractive || !isActivationKey(e)) {
            return;
        }
        e.preventDefault();
        navigate(videoUrl(video.id));
    }

    return (
        <div
            className={cn('profile-nonlive-row', isNotInteractive && 'profile-nonlive-row--not-interactive')}
            role="button"
            aria-label={video.title}
            tabIndex={isNotInteractive ? -1 : 0}
            onClick={handleRowClick}
            onKeyDown={handleRowKeyDown}
        >
            <NonLiveThumb video={video} />
            <div className="profile-nonlive-row__body">
                <div className="profile-nonlive-row__meta">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="profile-nonlive-row__time">{formatRelativeDate(video.createdAt, i18n.language)}</span>
                </div>
                <h4 className="profile-nonlive-row__title">{video.title}</h4>
                {hasTags && (
                    <p className="profile-nonlive-row__detail">{video.tags.map(tag => `#${tag}`).join('  ')}</p>
                )}
            </div>
            <NonLiveActions video={video} isFailed={isFailed} onEdit={onEdit} onRetry={onRetry} />
        </div>
    );
}

interface NonLiveSectionProps {
    isOwnProfile: boolean
    isLoadingVideos: boolean
    nonLiveVideos: Video[]
    nonLiveRef: React.RefObject<HTMLDivElement | null>
    onEdit: (video: Video) => void
    onRetry: () => void
}

function NonLiveSection({ isOwnProfile, isLoadingVideos, nonLiveVideos, nonLiveRef, onEdit, onRetry }: NonLiveSectionProps) {
    const { t } = useTranslation();
    const show = isOwnProfile && nonLiveVideos.length > 0 && !isLoadingVideos;

    if (!show) {
        return null;
    }

    return (
        <section className="profile-page__nonlive" ref={nonLiveRef}>
            <div className="profile-page__nonlive-header">
                <h3 className="profile-page__section-title">
                    {t('video.not_live_section')}
                    <span className="profile-page__section-count-badge">{nonLiveVideos.length}</span>
                </h3>
                <p className="profile-page__nonlive-subtitle">{t('profile.nonlive_subtitle')}</p>
            </div>
            <div className="profile-page__nonlive-list">
                {nonLiveVideos.map(video => (
                    <NonLiveRow key={video.id} video={video} onEdit={onEdit} onRetry={onRetry} />
                ))}
            </div>
        </section>
    );
}

function LoadingGrid({ show }: { show: boolean }) {
    if (!show) {
        return null;
    }

    return (
        <div className="profile-page__grid">
            {Array.from({ length: 6 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
            ))}
        </div>
    );
}

interface CuratedAllVideosHeaderProps {
    hasCuratedSections: boolean
    isLoadingVideos: boolean
    allVideosRef: React.RefObject<HTMLDivElement | null>
}

function CuratedAllVideosHeader({ hasCuratedSections, isLoadingVideos, allVideosRef }: CuratedAllVideosHeaderProps) {
    const { t } = useTranslation();
    const show = hasCuratedSections && !isLoadingVideos;

    if (!show) {
        return null;
    }

    return (
        <div className="profile-page__all-videos-header" ref={allVideosRef}>
            <h3 className="profile-page__section-title">
                <Play size={15} strokeWidth={2} />
                {t('channel.all_videos')}
            </h3>
        </div>
    );
}

interface PublishedAllVideosHeaderProps {
    hasCuratedSections: boolean
    isLoadingVideos: boolean
    showTopicView: boolean
    hasVideos: boolean
    filteredVideosCount: number
    totalViews: number | null
}

function PublishedAllVideosHeader({
    hasCuratedSections, isLoadingVideos, showTopicView, hasVideos, filteredVideosCount, totalViews,
}: PublishedAllVideosHeaderProps) {
    const { t } = useTranslation();
    const show = !hasCuratedSections && !isLoadingVideos && !showTopicView && hasVideos;

    if (!show) {
        return null;
    }

    return (
        <div className="profile-page__all-videos-header">
            <h3 className="profile-page__section-title">
                {t('profile.published_section')}
                <span className="profile-page__section-count-badge">{filteredVideosCount}</span>
            </h3>
            {totalViews !== null && (
                <span className="profile-page__all-videos-total-views">
                    {t('profile.total_views_summary', { views: Format.views(totalViews) })}
                </span>
            )}
        </div>
    );
}

interface PinnedVideoSectionProps {
    hasCuratedSections: boolean
    isLoadingVideos: boolean
    showTopicView: boolean
    pinnedVideo: Video | null
    deckGhostVideos: Video[]
    onEdit: (video: Video) => void
    onDelete: (id: VideoId) => void
}

function PinnedVideoSection({
    hasCuratedSections, isLoadingVideos, showTopicView, pinnedVideo, deckGhostVideos, onEdit, onDelete,
}: PinnedVideoSectionProps) {
    const { t } = useTranslation();
    const show = !hasCuratedSections && !isLoadingVideos && !showTopicView;

    if (!show || !pinnedVideo) {
        return null;
    }

    return (
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
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                </div>
            </div>
        </div>
    );
}

interface TopicViewSectionProps {
    isLoadingVideos: boolean
    showTopicView: boolean
    topicSections: TagSection[]
    onSelectTopic: (tag: Tag) => void
}

function TopicViewSection({ isLoadingVideos, showTopicView, topicSections, onSelectTopic }: TopicViewSectionProps) {
    const { t } = useTranslation();
    const show = !isLoadingVideos && showTopicView;

    if (!show) {
        return null;
    }

    const hasTopics = topicSections.length > 0;

    if (!hasTopics) {
        return (
            <EmptyState
                icon={<Hash size={36} strokeWidth={1.5} />}
                title={t('profile.no_topics')}
            />
        );
    }

    return <ProfileTopicGrid tagSections={topicSections} onSelectTag={onSelectTopic} />;
}

interface VideoGridSectionProps {
    isLoadingVideos: boolean
    showTopicView: boolean
    hasVideos: boolean
    filteredVideos: Video[]
    pinnedVideoId: VideoId | null | undefined
    isOwnProfile: boolean
    onEdit: (video: Video) => void
    onDelete: (id: VideoId) => void
}

function VideoGridSection({
    isLoadingVideos, showTopicView, hasVideos, filteredVideos, pinnedVideoId, isOwnProfile, onEdit, onDelete,
}: VideoGridSectionProps) {
    const { t } = useTranslation();
    const show = !isLoadingVideos && !showTopicView && hasVideos;

    if (!show) {
        return null;
    }

    return (
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
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    </div>
                );
            })}
        </div>
    );
}

interface EmptyVideosSectionProps {
    isLoadingVideos: boolean
    showTopicView: boolean
    hasVideos: boolean
}

function EmptyVideosSection({ isLoadingVideos, showTopicView, hasVideos }: EmptyVideosSectionProps) {
    const { t } = useTranslation();
    const show = !isLoadingVideos && !showTopicView && !hasVideos;

    if (!show) {
        return null;
    }

    return (
        <EmptyState
            icon={<VideoOff size={36} strokeWidth={1.5} />}
            title={t('video.no_own_videos')}
        />
    );
}

export default function ProfileVideoGrid({
    isLoadingVideos,
    hasCuratedSections,
    pinnedVideo,
    deckGhostVideos,
    filteredVideos,
    nonLiveVideos,
    pinnedVideoId,
    isOwnProfile,
    allVideosRef,
    nonLiveRef,
    hasVideos,
    showTopicView,
    topicSections,
    totalViews,
    onSelectTopic,
    onEdit,
    onDelete,
    onRetry,
}: ProfileVideoGridProps) {
    return (
        <main className="profile-page__main">
            <NonLiveSection
                isOwnProfile={isOwnProfile}
                isLoadingVideos={isLoadingVideos}
                nonLiveVideos={nonLiveVideos}
                nonLiveRef={nonLiveRef}
                onEdit={onEdit}
                onRetry={onRetry}
            />

            <LoadingGrid show={isLoadingVideos} />

            <CuratedAllVideosHeader
                hasCuratedSections={hasCuratedSections}
                isLoadingVideos={isLoadingVideos}
                allVideosRef={allVideosRef}
            />

            <PublishedAllVideosHeader
                hasCuratedSections={hasCuratedSections}
                isLoadingVideos={isLoadingVideos}
                showTopicView={showTopicView}
                hasVideos={hasVideos}
                filteredVideosCount={filteredVideos.length}
                totalViews={totalViews}
            />

            <PinnedVideoSection
                hasCuratedSections={hasCuratedSections}
                isLoadingVideos={isLoadingVideos}
                showTopicView={showTopicView}
                pinnedVideo={pinnedVideo}
                deckGhostVideos={deckGhostVideos}
                onEdit={onEdit}
                onDelete={onDelete}
            />

            <TopicViewSection
                isLoadingVideos={isLoadingVideos}
                showTopicView={showTopicView}
                topicSections={topicSections}
                onSelectTopic={onSelectTopic}
            />

            <VideoGridSection
                isLoadingVideos={isLoadingVideos}
                showTopicView={showTopicView}
                hasVideos={hasVideos}
                filteredVideos={filteredVideos}
                pinnedVideoId={pinnedVideoId}
                isOwnProfile={isOwnProfile}
                onEdit={onEdit}
                onDelete={onDelete}
            />

            <EmptyVideosSection isLoadingVideos={isLoadingVideos} showTopicView={showTopicView} hasVideos={hasVideos} />
        </main>
    );
}

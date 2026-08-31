import { Play, Pin, VideoOff, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VideoCard from '@components/video/card';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import EmptyState from '@ui/empty/empty';
import type { Video, VideoId } from '@models';

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
    hasVideos: boolean
    onEdit: (video: Video) => void
    onDelete: (id: VideoId) => void
    onRetry: () => void
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
    hasVideos,
    onEdit,
    onDelete,
    onRetry,
}: ProfileVideoGridProps) {
    const { t } = useTranslation();
    const hasNonLiveVideos = isOwnProfile && nonLiveVideos.length > 0;

    return (
        <main className="profile-page__main">
            {hasNonLiveVideos && !isLoadingVideos && (
                <section className="profile-page__nonlive">
                    <div className="profile-page__all-videos-header">
                        <h3 className="profile-page__section-title">
                            <EyeOff size={15} strokeWidth={2} />
                            {t('video.not_live_section', { count: nonLiveVideos.length })}
                        </h3>
                    </div>
                    <div className="profile-page__grid">
                        {nonLiveVideos.map(video => (
                            <div
                                key={video.id}
                                className="profile-page__card-wrapper profile-page__card-wrapper--nonlive"
                            >
                                <VideoCard
                                    video={video}
                                    showActions={true}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onRetry={onRetry}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {isLoadingVideos && (
                <div className="profile-page__grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {hasCuratedSections && !isLoadingVideos && (
                <div className="profile-page__all-videos-header" ref={allVideosRef}>
                    <h3 className="profile-page__section-title">
                        <Play size={15} strokeWidth={2} />
                        {t('channel.all_videos')}
                    </h3>
                </div>
            )}

            {!hasCuratedSections && !isLoadingVideos && pinnedVideo && (
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
            )}

            {!isLoadingVideos && hasVideos && (
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
            )}

            {!isLoadingVideos && !hasVideos && (
                <EmptyState
                    icon={<VideoOff size={36} strokeWidth={1.5} />}
                    title={t('video.no_own_videos')}
                />
            )}
        </main>
    );
}

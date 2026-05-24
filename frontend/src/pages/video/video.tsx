import { useRef, useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Bookmark, BookOpen, List } from 'lucide-react';
import VideoPlayer from '@components/player/player';
import CommentSection from '@components/comment/section';
import VideoRow from '@components/video/row';
import VideoRowSkeleton from '@components/video/rowSkeleton';
import FilterPanel from '@components/filter/panel';
import type { FilterState } from '@components/filter/panel';
import ReactionBtn from '@components/video/reactionBtn';
import SavePopover from '@components/video/savePopover';
import ReadingMode from '@components/video/readingMode';
import AiSuggestions from '@components/video/aiSuggestions';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { domain } from '@domain';
import { video as videoApi, toVuid, AnalyticsSource } from '@api';
import TagBadge from '@components/tag/badge';
import { Avatar } from '@ui';
import './video.css';
import { SidebarTab } from '@enums/sidebarTab';
import {
    useAuth,
    useVideo,
    useSubscription,
    useVideoFetch,
    useRelatedVideos,
    useVideoContent,
    useVideoProgress,
    useAutoplay,
    useKeyboardShortcuts,
} from '@hooks';
import { VideoFilter, Format, TagColors, ROUTES, formatRelativeDate, cn } from '@utils';
import type { Video, VideoId, Tag } from '@models';
import { useViewTracking } from './hooks/useViewTracking';
import { useSkipAnalytics } from './hooks/useSkipAnalytics';
import { useVideoReactions } from './hooks/useVideoReactions';
import { useVideoShare } from './hooks/useVideoShare';
import { useVideoSave } from './hooks/useVideoSave';
import VideoNotFound from './components/VideoNotFound';
import VideoProcessingScreen from './components/VideoProcessingScreen';
import AutoplayBanner from './components/AutoplayBanner';
import ShareMenu from './components/ShareMenu';
import VideoFallback from './components/VideoFallback';

export default function VideoPage() {
    const { t, i18n } = useTranslation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('v') ?? undefined;
    const dispatch = useAppDispatch();

    const {
        videos, likedVideos, dislikedVideos,
        likeVideo, dislikeVideo, watchVideo,
        updateProgress, videoProgress, autoplay, closeMiniPlayer,
        consumePendingVideoSeek,
    } = useVideo();

    const { user: authUser } = useAuth();
    const { isSubscribed, toggleSubscription } = useSubscription();
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const [descExpanded, setDescExpanded] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>(SidebarTab.RELATED);
    const [readingMode, setReadingMode] = useState(false);

    const storeVideo = videos.find((v: Video) => v.id === (id as VideoId));
    const { video, fetchFailed } = useVideoFetch(id, storeVideo);
    const { relatedVideos, loadingRelated } = useRelatedVideos(video?.id, video?.tags ?? []);
    const { summary, transcription, setTranscription } = useVideoContent(id, video?.status);

    const hasVideo = video !== undefined;
    const isOwner = authUser !== null && video !== undefined && domain.video.isOwnedBy(video, authUser);
    const currentPercent = video !== undefined ? (videoProgress[video.id] ?? 0) : 0;

    const videoRef = useRef<HTMLVideoElement>(null);

    useViewTracking(id, hasVideo, watchVideo);
    useSkipAnalytics(id, currentPercent);

    const { autoplayCountdown, startAutoplayCountdown, cancelAutoplay } = useAutoplay({
        id,
        autoplay,
        relatedVideos,
    });

    const {
        showCompletion,
        handleLoadedMetadata, handleTimeUpdate, handleVideoEnded, getCurrentTime,
    } = useVideoProgress({
        id: id as VideoId | undefined,
        videoRef,
        video,
        videoProgress,
        updateProgress: (vid, pct) => updateProgress(vid, pct),
        onBackendSync: (vid, pct) => videoApi.updateProgress(toVuid(vid), pct).catch(() => { }),
        consumePendingVideoSeek: (vid) => consumePendingVideoSeek(vid),
        onCompleted: startAutoplayCountdown,
        onFinished: (vid) => videoApi.recordView(toVuid(vid)),
    });

    const reactions = useVideoReactions({ videoId: video?.id, likedVideos, dislikedVideos, likeVideo, dislikeVideo });
    const share = useVideoShare(getCurrentTime);
    const { isSaved, handleSave } = useVideoSave(video?.id);

    const allRelatedTags = useMemo(() => {
        const tagSet = new Set<Tag>();

        for (const v of relatedVideos) {
            for (const tag of v.tags) {
                tagSet.add(tag);
            }
        }

        return Array.from(tagSet).sort();
    }, [relatedVideos]);

    const filteredRelated = useMemo(
        () => VideoFilter.apply(relatedVideos, filterState),
        [relatedVideos, filterState],
    );

    useEffect(() => {
        closeMiniPlayer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useKeyboardShortcuts({
        onOpenUpload: () => { },
        onOpenShortcuts: () => { },
        onFocusSearch: () => { },
        videoPageId: id,
        onLike: reactions.handleLike,
        onSave: handleSave,
    });

    if (!hasVideo) {
        return <VideoNotFound fetchFailed={fetchFailed} />;
    }

    if (domain.video.isProcessing(video)) {
        return <VideoProcessingScreen video={video} />;
    }

    const videoId = video.id;
    const isChannelSubscribed = isSubscribed(video.channelId);
    const hasLongDesc = (video.description ?? '').length > 220;
    const hasVideoFile = video.videoUrl !== undefined && video.videoUrl !== '';
    const isAutoplayActive = autoplayCountdown !== null;
    const nextVideo = relatedVideos[0];
    const tagPalette = video.tags[0] ? TagColors.palette(video.tags[0]) : null;
    const videoUrl = video.videoUrl ?? '';

    function handleRetryTranscription() {
        if (!video) { return; }
        const vuid = toVuid(video.id);
        videoApi.retryTranscription(vuid).then(didSucceed => {
            if (!didSucceed) {
                return;
            }

            videoApi.getTranscription(vuid).then(result => {
                setTranscription(result.ok ? result.data : null);
            });
        });
    }

    return (
        <div className="video-page">
            <div className="video-page__layout">
                <main className="video-page__main">
                    {readingMode && transcription !== null ? (
                        <ReadingMode
                            summary={summary}
                            transcription={transcription}
                            isOwner={isOwner}
                            onRetryTranscription={handleRetryTranscription}
                            currentTime={getCurrentTime()}
                            onSeekToChapter={(seconds) => {
                                if (videoRef.current) {
                                    videoRef.current.currentTime = seconds;
                                }
                            }}
                        />
                    ) : (
                        <div className="video-page__player-wrap">
                            {hasVideoFile ? (
                                <VideoPlayer
                                    videoRef={videoRef}
                                    src={videoUrl}
                                    chapters={summary?.chapters}
                                    onTimeUpdate={handleTimeUpdate}
                                    onEnded={handleVideoEnded}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    showCompletion={showCompletion}
                                    ambientColor={tagPalette?.color}
                                />
                            ) : (
                                <VideoFallback thumbnail={video.thumbnail} title={video.title} />
                            )}
                        </div>
                    )}

                    {isAutoplayActive && nextVideo && (
                        <AutoplayBanner
                            countdown={autoplayCountdown}
                            nextVideo={nextVideo}
                            onCancel={cancelAutoplay}
                        />
                    )}

                    <div className="video-page__meta">
                        <h1 className="video-page__title">{video.title}</h1>

                        <div className="video-page__channel-row">
                            <div className="video-page__channel-info">
                                <Link
                                    to={ROUTES.CHANNEL.replace(':id', video.channelId)}
                                    className="video-page__channel-link"
                                >
                                    <Avatar name={video.channel} size="sm" />
                                    <span className="video-page__channel-name">{video.channel}</span>
                                </Link>
                                <button
                                    type="button"
                                    className={cn('video-page__subscribe-btn', isChannelSubscribed && 'video-page__subscribe-btn--active')}
                                    onClick={() => toggleSubscription(video.channelId)}
                                    aria-pressed={isChannelSubscribed}
                                >
                                    {isChannelSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
                                </button>
                            </div>

                            <div className="video-page__actions">
                                <ReactionBtn
                                    isActive={reactions.isLiked}
                                    isAnimating={reactions.likeAnimating}
                                    icon={<ThumbsUp size={20} strokeWidth={1.75} fill="none" />}
                                    iconActive={<ThumbsUp size={20} strokeWidth={1.75} fill="currentColor" />}
                                    label={t('video.like')}
                                    activeLabel={t('video.liked')}
                                    className="video-page__reaction-btn"
                                    activeClass="video-page__reaction-btn--liked"
                                    onClick={reactions.handleLike}
                                />

                                <ReactionBtn
                                    isActive={reactions.isDisliked}
                                    isAnimating={reactions.dislikeAnimating}
                                    icon={<ThumbsDown size={20} strokeWidth={1.75} fill="none" />}
                                    iconActive={<ThumbsDown size={20} strokeWidth={1.75} fill="currentColor" />}
                                    label={t('video.dislike')}
                                    activeLabel={t('video.disliked')}
                                    className="video-page__reaction-btn"
                                    activeClass="video-page__reaction-btn--disliked"
                                    onClick={reactions.handleDislike}
                                />

                                <SavePopover videoId={videoId}>
                                    <ReactionBtn
                                        isActive={isSaved}
                                        icon={<Bookmark size={20} strokeWidth={1.75} fill="none" />}
                                        iconActive={<Bookmark size={20} strokeWidth={1.75} fill="currentColor" />}
                                        label={t('video.save')}
                                        activeLabel={t('video.saved')}
                                        className="video-page__reaction-btn"
                                        activeClass="video-page__reaction-btn--saved"
                                        onClick={() => { }}
                                    />
                                </SavePopover>

                                <ShareMenu
                                    isOpen={share.isShareDropdownOpen}
                                    onOpenChange={share.setIsShareDropdownOpen}
                                    isCopied={share.isCopied}
                                    onCopyLink={share.handleShareCopyLink}
                                    onCopyAtTime={share.handleShareCopyAtTime}
                                />

                                {transcription !== null && (
                                    <ReactionBtn
                                        isActive={readingMode}
                                        icon={<BookOpen size={20} strokeWidth={1.75} />}
                                        iconActive={<BookOpen size={20} strokeWidth={1.75} fill="currentColor" />}
                                        label={t('video.reading_mode')}
                                        activeLabel={t('video.exit_reading_mode')}
                                        className="video-page__reaction-btn"
                                        activeClass="video-page__reaction-btn--reading"
                                        onClick={() => setReadingMode(v => !v)}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="video-page__description-card">
                            <div className="video-page__description-meta">
                                <span>{Format.views(video.views)} {t('video.views')}</span>
                                <span className="video-page__description-sep">·</span>
                                <span>{formatRelativeDate(video.publishedAt, i18n.language)}</span>
                            </div>

                            {video.description && (
                                <>
                                    <p className={cn('video-page__description', !descExpanded && hasLongDesc && 'video-page__description--clamped')}>
                                        {video.description}
                                    </p>
                                    {hasLongDesc && (
                                        <button
                                            type="button"
                                            className="video-page__description-toggle"
                                            onClick={() => setDescExpanded(v => !v)}
                                        >
                                            {descExpanded ? t('video.show_less') : t('video.show_more')}
                                        </button>
                                    )}
                                </>
                            )}

                            {video.tags.length > 0 && (
                                <div className="video-page__tags">
                                    {video.tags.map(tag => (
                                        <TagBadge
                                            key={tag}
                                            tag={tag}
                                            prefix="#"
                                            onClick={() => dispatch(videoActions.openTagView({ tag, fromVideoId: video.id }))}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {isOwner && hasVideo && <AiSuggestions video={video} />}

                    <CommentSection vuid={toVuid(video.id)} videoChannelId={video.channelId} />
                </main>

                <aside className="video-page__sidebar">
                    <div className="video-page__sidebar-tabs" role="tablist">
                        <button
                            role="tab"
                            aria-selected={sidebarTab === SidebarTab.RELATED}
                            className={cn('video-page__sidebar-tab', sidebarTab === SidebarTab.RELATED && 'video-page__sidebar-tab--active')}
                            onClick={() => setSidebarTab(SidebarTab.RELATED)}
                        >
                            <List size={14} />
                            {t('video.related')}
                        </button>
                        <div className="video-page__sidebar-filter-slot">
                            <FilterPanel
                                allTags={allRelatedTags}
                                value={filterState}
                                onChange={setFilterState}
                                iconOnly
                            />
                        </div>
                    </div>

                    {sidebarTab === SidebarTab.RELATED && (
                        <div className="video-page__sidebar-list">
                            {loadingRelated
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <VideoRowSkeleton key={i} />
                                ))
                                : filteredRelated.map((v, idx) => (
                                    <VideoRow key={v.id} video={v} source={AnalyticsSource.RECOMMENDED} position={idx} />
                                ))
                            }
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}

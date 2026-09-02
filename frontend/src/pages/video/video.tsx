import { lazy, Suspense, useRef, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { domain } from '@domain';
import { video as videoApi, toVuid } from '@api';
import type { VideoSummary, VideoTranscription } from '@api';
import './video.css';
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
    usePlaybackPrefs,
} from '@hooks';
import { TagColors, cn, ROUTES } from '@utils';
import { CirclePause } from '@components/icons/icons';
import type { Video, VideoId, User } from '@models';
import { useViewTracking } from './hooks/useViewTracking';
import { useSkipAnalytics } from './hooks/useSkipAnalytics';
import { useVideoReactions } from './hooks/useVideoReactions';
import { useVideoShare } from './hooks/useVideoShare';
import { useVideoSave } from './hooks/useVideoSave';
import VideoNotFound from './components/VideoNotFound';
import VideoProcessingScreen from './components/VideoProcessingScreen';
import VideoFallback from './components/VideoFallback';
import AutoplayBanner from './components/AutoplayBanner';
import VideoPlayerArea from './components/VideoPlayerArea';
import VideoInfo from './components/VideoInfo';
import VideoSidebar from './components/VideoSidebar';

const StagingPanel = lazy(() => import('@components/video/stagingPanel'));
const ChatSection = lazy(() => import('@components/chat/section'));
const CommentSection = lazy(() => import('@components/comment/section'));

function resolveIsOwner(authUser: User | null, video: Video | undefined): boolean {
    return authUser !== null && video !== undefined && domain.video.isOwnedBy(video, authUser);
}

function resolveCurrentPercent(video: Video | undefined, videoProgress: Record<string, number>): number {
    return video !== undefined ? (videoProgress[video.id] ?? 0) : 0;
}

function resolvePlaybackSrc(video: Video): string {
    // Prefer the HLS manifest; fall back to the raw file while transcoding is still in flight.
    return video.hlsUrl ?? video.videoUrl ?? '';
}

function resolveCaptions(video: Video) {
    return video.captions ?? [];
}

function resolveChapters(summary: VideoSummary | null) {
    return summary?.chapters;
}

function resolveAmbientColor(tagPalette: ReturnType<typeof resolveTagPalette>) {
    return tagPalette?.color;
}

function resolveTagPalette(video: Video) {
    return video.tags[0] ? TagColors.palette(video.tags[0]) : null;
}

function resolveIsStaging(isOwner: boolean, video: Video): boolean {
    return isOwner && domain.video.isDraft(video);
}

function resolveVideoIdParam(searchParams: URLSearchParams): string | undefined {
    return searchParams.get('v') ?? undefined;
}

function resolveLayoutClass(theaterMode: boolean): string {
    return cn('video-page__layout', theaterMode && 'video-page__layout--theater');
}

interface StagingSectionProps {
    isStaging: boolean
    video: Video
    summary: VideoSummary | null
}

function StagingSection({ isStaging, video, summary }: StagingSectionProps) {
    if (!isStaging) {
        return null;
    }

    return (
        <Suspense fallback={null}>
            <StagingPanel video={video} summary={summary} />
        </Suspense>
    );
}

interface StopAfterButtonProps {
    stopAfterCurrent: boolean
    onToggleStopAfterCurrent: () => void
}

function StopAfterButton({ stopAfterCurrent, onToggleStopAfterCurrent }: StopAfterButtonProps) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            className={cn('video-page__stop-after', stopAfterCurrent && 'video-page__stop-after--active')}
            onClick={onToggleStopAfterCurrent}
            aria-pressed={stopAfterCurrent}
        >
            <CirclePause size={14} strokeWidth={1.75} />
            {stopAfterCurrent ? t('video.stop_after_on') : t('video.stop_after')}
        </button>
    );
}

interface AutoplayControlsProps {
    isAutoplayActive: boolean
    autoplayCountdown: number | null
    nextVideo: Video | undefined
    onCancel: () => void
    autoplay: boolean
    hasVideoFile: boolean
    stopAfterCurrent: boolean
    onToggleStopAfterCurrent: () => void
}

function AutoplayControls({
    isAutoplayActive, autoplayCountdown, nextVideo, onCancel,
    autoplay, hasVideoFile, stopAfterCurrent, onToggleStopAfterCurrent,
}: AutoplayControlsProps) {
    if (nextVideo === undefined) {
        return null;
    }

    if (isAutoplayActive && autoplayCountdown !== null) {
        return <AutoplayBanner countdown={autoplayCountdown} nextVideo={nextVideo} onCancel={onCancel} />;
    }

    const showStopAfterButton = autoplay && !isAutoplayActive && hasVideoFile;

    if (!showStopAfterButton) {
        return null;
    }

    return <StopAfterButton stopAfterCurrent={stopAfterCurrent} onToggleStopAfterCurrent={onToggleStopAfterCurrent} />;
}

interface ChatSectionWrapperProps {
    authUser: User | null
    chatRef: React.RefObject<HTMLDivElement | null>
    video: Video
    transcription: VideoTranscription | null
}

function ChatSectionWrapper({ authUser, chatRef, video, transcription }: ChatSectionWrapperProps) {
    if (authUser === null) {
        return null;
    }

    return (
        <div ref={chatRef} className="chat-wrapper">
            <Suspense fallback={null}>
                <ChatSection vuid={toVuid(video.id)} transcription={transcription} />
            </Suspense>
        </div>
    );
}

interface VideoFailedScreenProps {
    video: Video
    isOwner: boolean
    onDeleteAndReupload: () => void
}

function VideoFailedScreen({ video, isOwner, onDeleteAndReupload }: VideoFailedScreenProps) {
    return (
        <div className="video-page">
            <div className="video-page__layout">
                <main className="video-page__main">
                    <VideoFallback
                        thumbnail={video.thumbnail}
                        title={video.title}
                        isFailed
                        isOwner={isOwner}
                        onDeleteAndReupload={isOwner ? onDeleteAndReupload : undefined}
                    />
                </main>
            </div>
        </div>
    );
}

export default function VideoPage() {
    const { i18n } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const id = resolveVideoIdParam(searchParams);

    const {
        videos, likedVideos, dislikedVideos,
        likeVideo, dislikeVideo, watchVideo,
        updateProgress, videoProgress, autoplay, closeMiniPlayer,
        consumePendingVideoSeek, openTagView, deleteVideo, openUploadModal,
    } = useVideo();

    const { user: authUser } = useAuth();
    const { isSubscribed, toggleSubscription } = useSubscription();
    const { theaterMode } = usePlaybackPrefs();
    const [descExpanded, setDescExpanded] = useState(false);
    const [readingMode, setReadingMode] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);

    function handleScrollToChat() {
        const el = chatRef.current;
        if (!el) {
            return;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.remove('chat-wrapper--flash');
        void el.offsetHeight; // force reflow to restart the CSS animation
        el.classList.add('chat-wrapper--flash');
    }

    function handleSeek(seconds: number) {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds;
        }
    }

    const storeVideo = videos.find((v: Video) => v.id === (id as VideoId));
    const { video, fetchFailed } = useVideoFetch(id, storeVideo);
    const { relatedVideos, loadingRelated } = useRelatedVideos(video?.id);
    const { summary, transcription, setTranscription } = useVideoContent(id, video?.status);

    const hasVideo = video !== undefined;
    const isOwner = resolveIsOwner(authUser, video);
    const currentPercent = resolveCurrentPercent(video, videoProgress);

    useViewTracking(id, hasVideo, watchVideo);
    useSkipAnalytics(id, currentPercent);
    useEffect(() => {
        closeMiniPlayer();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const {
        autoplayCountdown, startAutoplayCountdown, cancelAutoplay,
        stopAfterCurrent, toggleStopAfterCurrent,
    } = useAutoplay({ id, autoplay, relatedVideos });
    const {
        showCompletion,
        handleLoadedMetadata, handleTimeUpdate, handleVideoEnded, getCurrentTime,
    } = useVideoProgress({
        id: id as VideoId | undefined,
        videoRef,
        updateProgress: (vid, pct) => updateProgress(vid, pct),
        onBackendSync: (vid, pct) => videoApi.updateProgress(toVuid(vid), pct).catch(() => { }),
        consumePendingVideoSeek: (vid) => consumePendingVideoSeek(vid),
        onCompleted: startAutoplayCountdown,
    });

    const reactions = useVideoReactions({ videoId: video?.id, likedVideos, dislikedVideos, likeVideo, dislikeVideo });
    const share = useVideoShare(getCurrentTime);
    const { isSaved, handleSave } = useVideoSave(video?.id);

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

    function handleDeleteAndReupload() {
        if (!video) {
            return;
        }
        deleteVideo(video.id);
        navigate(ROUTES.HOME);
        openUploadModal();
    }

    if (domain.video.isFailed(video)) {
        return <VideoFailedScreen video={video} isOwner={isOwner} onDeleteAndReupload={handleDeleteAndReupload} />;
    }

    const isStaging = resolveIsStaging(isOwner, video);
    const isChannelSubscribed = isSubscribed(video.channelId);
    const isAutoplayActive = autoplayCountdown !== null;
    const nextVideo = relatedVideos[0];
    const tagPalette = resolveTagPalette(video);
    const playbackSrc = resolvePlaybackSrc(video);
    const hasVideoFile = playbackSrc !== '';

    function handleRetryTranscription() {
        if (!video) {
            return;
        }
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
            <div className={resolveLayoutClass(theaterMode)}>
                <main className="video-page__main">
                    <StagingSection isStaging={isStaging} video={video} summary={summary} />

                    <VideoPlayerArea
                        readingMode={readingMode}
                        transcription={transcription}
                        summary={summary}
                        isOwner={isOwner}
                        onRetryTranscription={handleRetryTranscription}
                        getCurrentTime={getCurrentTime}
                        videoRef={videoRef}
                        hasVideoFile={hasVideoFile}
                        src={playbackSrc}
                        autoPlay={autoplay}
                        captions={resolveCaptions(video)}
                        chapters={resolveChapters(summary)}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleVideoEnded}
                        onLoadedMetadata={handleLoadedMetadata}
                        showCompletion={showCompletion}
                        ambientColor={resolveAmbientColor(tagPalette)}
                        thumbnail={video.thumbnail}
                        title={video.title}
                    />

                    <AutoplayControls
                        isAutoplayActive={isAutoplayActive}
                        autoplayCountdown={autoplayCountdown}
                        nextVideo={nextVideo}
                        onCancel={cancelAutoplay}
                        autoplay={autoplay}
                        hasVideoFile={hasVideoFile}
                        stopAfterCurrent={stopAfterCurrent}
                        onToggleStopAfterCurrent={toggleStopAfterCurrent}
                    />

                    <VideoInfo
                        video={video}
                        isOwner={isOwner}
                        isAuthenticated={authUser !== null}
                        isChannelSubscribed={isChannelSubscribed}
                        onSubscribe={() => toggleSubscription(video.channelId)}
                        reactions={reactions}
                        isSaved={isSaved}
                        share={share}
                        transcription={transcription}
                        readingMode={readingMode}
                        onReadingModeToggle={() => setReadingMode(v => !v)}
                        descExpanded={descExpanded}
                        onDescExpandToggle={() => setDescExpanded(v => !v)}
                        language={i18n.language}
                        onTagClick={(tag) => openTagView(tag, video?.id ?? null)}
                        onScrollToChat={handleScrollToChat}
                        onSeek={handleSeek}
                    />

                    <ChatSectionWrapper authUser={authUser} chatRef={chatRef} video={video} transcription={transcription} />

                    <Suspense fallback={null}>
                        <CommentSection
                            vuid={toVuid(video.id)}
                            videoChannelId={video.channelId}
                            onSeek={handleSeek}
                        />
                    </Suspense>
                </main>

                <VideoSidebar
                    relatedVideos={relatedVideos}
                    loadingRelated={loadingRelated}
                    summary={summary}
                    transcription={transcription}
                    getCurrentTime={getCurrentTime}
                    videoRef={videoRef}
                    onSeekToChapter={handleSeek}
                />
            </div>
        </div>
    );
}

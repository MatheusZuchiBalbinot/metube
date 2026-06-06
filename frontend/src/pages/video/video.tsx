import { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { domain } from '@domain';
import { video as videoApi, toVuid } from '@api';
import CommentSection from '@components/comment/section';
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
} from '@hooks';
import { TagColors } from '@utils';
import type { Video, VideoId } from '@models';
import { useViewTracking } from './hooks/useViewTracking';
import { useSkipAnalytics } from './hooks/useSkipAnalytics';
import { useVideoReactions } from './hooks/useVideoReactions';
import { useVideoShare } from './hooks/useVideoShare';
import { useVideoSave } from './hooks/useVideoSave';
import VideoNotFound from './components/VideoNotFound';
import VideoProcessingScreen from './components/VideoProcessingScreen';
import StagingPanel from '@components/video/stagingPanel';
import AutoplayBanner from './components/AutoplayBanner';
import VideoPlayerArea from './components/VideoPlayerArea';
import VideoInfo from './components/VideoInfo';
import VideoSidebar from './components/VideoSidebar';
import ChatSection from '@components/chat/section';

export default function VideoPage() {
    const { i18n } = useTranslation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('v') ?? undefined;

    const {
        videos, likedVideos, dislikedVideos,
        likeVideo, dislikeVideo, watchVideo,
        updateProgress, videoProgress, autoplay, closeMiniPlayer,
        consumePendingVideoSeek, openTagView,
    } = useVideo();

    const { user: authUser } = useAuth();
    const { isSubscribed, toggleSubscription } = useSubscription();
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

    const storeVideo = videos.find((v: Video) => v.id === (id as VideoId));
    const { video, fetchFailed } = useVideoFetch(id, storeVideo);
    const { relatedVideos, loadingRelated } = useRelatedVideos(video?.id, video?.tags ?? []);
    const { summary, transcription, setTranscription } = useVideoContent(id, video?.status);

    const hasVideo = video !== undefined;
    const isOwner = authUser !== null && video !== undefined && domain.video.isOwnedBy(video, authUser);
    const currentPercent = video !== undefined ? (videoProgress[video.id] ?? 0) : 0;

    useViewTracking(id, hasVideo, watchVideo);
    useSkipAnalytics(id, currentPercent);
    useEffect(() => {
        closeMiniPlayer();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const { autoplayCountdown, startAutoplayCountdown, cancelAutoplay } = useAutoplay({ id, autoplay, relatedVideos });
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

    const isStaging = isOwner && domain.video.isDraft(video);
    const isChannelSubscribed = isSubscribed(video.channelId);
    const isAutoplayActive = autoplayCountdown !== null;
    const nextVideo = relatedVideos[0];
    const tagPalette = video.tags[0] ? TagColors.palette(video.tags[0]) : null;
    // Prefer the HLS manifest; fall back to the raw file while transcoding is still in flight.
    const playbackSrc = video.hlsUrl ?? video.videoUrl ?? '';

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
            <div className="video-page__layout">
                <main className="video-page__main">
                    {isStaging && <StagingPanel video={video} summary={summary} />}

                    <VideoPlayerArea
                        readingMode={readingMode}
                        transcription={transcription}
                        summary={summary}
                        isOwner={isOwner}
                        onRetryTranscription={handleRetryTranscription}
                        getCurrentTime={getCurrentTime}
                        videoRef={videoRef}
                        hasVideoFile={playbackSrc !== ''}
                        src={playbackSrc}
                        autoPlay={autoplay}
                        captions={video.captions}
                        chapters={summary?.chapters}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleVideoEnded}
                        onLoadedMetadata={handleLoadedMetadata}
                        showCompletion={showCompletion}
                        ambientColor={tagPalette?.color}
                        thumbnail={video.thumbnail}
                        title={video.title}
                    />

                    {isAutoplayActive && nextVideo && (
                        <AutoplayBanner countdown={autoplayCountdown} nextVideo={nextVideo} onCancel={cancelAutoplay} />
                    )}

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
                        onTagClick={openTagView}
                        onScrollToChat={authUser !== null ? handleScrollToChat : undefined}
                    />

                    {authUser !== null && (
                        <div ref={chatRef} className="chat-wrapper">
                            <ChatSection vuid={toVuid(video.id)} transcription={transcription} summary={summary} />
                        </div>
                    )}

                    <CommentSection vuid={toVuid(video.id)} videoChannelId={video.channelId} />
                </main>

                <VideoSidebar
                    relatedVideos={relatedVideos}
                    loadingRelated={loadingRelated}
                    summary={summary}
                    transcription={transcription}
                    getCurrentTime={getCurrentTime}
                    videoRef={videoRef}
                    onSeekToChapter={(seconds) => {
                        if (videoRef.current) {
                            videoRef.current.currentTime = seconds;
                        }
                    }}
                />
            </div>
        </div>
    );
}

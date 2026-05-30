import VideoPlayer from '@components/player/player';
import ReadingMode from '@components/video/readingMode';
import VideoFallback from './VideoFallback';
import { cn } from '@utils';
import type { VideoSummary, VideoTranscription } from '@api';

interface VideoPlayerAreaProps {
    readingMode: boolean
    transcription: VideoTranscription | null
    summary: VideoSummary | null
    isOwner: boolean
    onRetryTranscription: () => void
    getCurrentTime: () => number
    videoRef: React.RefObject<HTMLVideoElement | null>
    hasVideoFile: boolean
    src: string
    autoPlay: boolean
    chapters: VideoSummary['chapters'] | undefined
    onTimeUpdate: () => void
    onEnded: () => void
    onLoadedMetadata: () => void
    showCompletion: boolean
    ambientColor: string | undefined
    thumbnail: string | undefined
    title: string
}

export default function VideoPlayerArea({
    readingMode, transcription, summary, isOwner, onRetryTranscription,
    getCurrentTime, videoRef, hasVideoFile, src, autoPlay, chapters,
    onTimeUpdate, onEnded, onLoadedMetadata, showCompletion, ambientColor,
    thumbnail, title,
}: VideoPlayerAreaProps) {
    const isReadingMode = readingMode && transcription !== null;

    return (
        <>
            {/* Always mounted so the video element keeps its currentTime across mode toggles */}
            <div className={cn('video-page__player-wrap', isReadingMode && 'video-page__player-wrap--hidden')}>
                {hasVideoFile ? (
                    <VideoPlayer
                        videoRef={videoRef}
                        src={src}
                        autoPlay={autoPlay}
                        chapters={chapters}
                        onTimeUpdate={onTimeUpdate}
                        onEnded={onEnded}
                        onLoadedMetadata={onLoadedMetadata}
                        showCompletion={showCompletion}
                        ambientColor={ambientColor}
                    />
                ) : (
                    <VideoFallback thumbnail={thumbnail} title={title} />
                )}
            </div>

            {isReadingMode && (
                <ReadingMode
                    summary={summary}
                    transcription={transcription}
                    isOwner={isOwner}
                    onRetryTranscription={onRetryTranscription}
                    currentTime={getCurrentTime()}
                    videoRef={videoRef}
                    onSeekToChapter={(seconds) => {
                        if (videoRef.current) {
                            videoRef.current.currentTime = seconds;
                        }
                    }}
                />
            )}
        </>
    );
}

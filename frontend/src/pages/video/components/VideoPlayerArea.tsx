import VideoPlayer from '@components/player/player';
import ReadingMode from '@components/video/readingMode';
import VideoFallback from './VideoFallback';
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
    getCurrentTime, videoRef, hasVideoFile, src, chapters,
    onTimeUpdate, onEnded, onLoadedMetadata, showCompletion, ambientColor,
    thumbnail, title,
}: VideoPlayerAreaProps) {
    if (readingMode && transcription !== null) {
        return (
            <ReadingMode
                summary={summary}
                transcription={transcription}
                isOwner={isOwner}
                onRetryTranscription={onRetryTranscription}
                currentTime={getCurrentTime()}
                onSeekToChapter={(seconds) => {
                    if (videoRef.current) {
                        videoRef.current.currentTime = seconds;
                    }
                }}
            />
        );
    }

    return (
        <div className="video-page__player-wrap">
            {hasVideoFile ? (
                <VideoPlayer
                    videoRef={videoRef}
                    src={src}
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
    );
}

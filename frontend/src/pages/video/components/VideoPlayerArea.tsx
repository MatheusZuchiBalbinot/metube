import { X } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import VideoPlayer from '@components/player/player';
import ReadingMode from '@components/video/readingMode';
import VideoFallback from './VideoFallback';
import { cn } from '@utils';
import { usePlaybackPrefs } from '@hooks';
import { usePinnedPlayer } from '../hooks/usePinnedPlayer';
import type { VideoSummary, VideoTranscription } from '@api';
import type { VideoCaption } from '@models';

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
    captions: VideoCaption[]
    chapters: VideoSummary['chapters'] | undefined
    onTimeUpdate: () => void
    onEnded: () => void
    onLoadedMetadata: () => void
    showCompletion: boolean
    ambientColor: string | undefined
    thumbnail: string | undefined
    title: string
}

interface PlayerWrapProps {
    wrapRef: React.RefObject<HTMLDivElement | null>
    isReadingMode: boolean
    pinned: boolean
    onUnpin: () => void
    hasVideoFile: boolean
    videoRef: React.RefObject<HTMLVideoElement | null>
    src: string
    autoPlay: boolean
    captions: VideoCaption[]
    chapters: VideoSummary['chapters'] | undefined
    onTimeUpdate: () => void
    onEnded: () => void
    onLoadedMetadata: () => void
    showCompletion: boolean
    ambientColor: string | undefined
    theaterMode: boolean
    onTheaterToggle: () => void
    thumbnail: string | undefined
    title: string
}

function PlayerWrap({
    wrapRef, isReadingMode, pinned, onUnpin, hasVideoFile, videoRef, src, autoPlay,
    captions, chapters, onTimeUpdate, onEnded, onLoadedMetadata, showCompletion,
    ambientColor, theaterMode, onTheaterToggle, thumbnail, title,
}: PlayerWrapProps) {
    const { t } = useTranslation();

    return (
        <div
            ref={wrapRef}
            className={cn(
                'video-page__player-wrap',
                isReadingMode && 'video-page__player-wrap--hidden',
                pinned && 'video-page__player-wrap--pinned',
            )}
        >
            {pinned && (
                <button
                    type="button"
                    className="video-page__pin-close"
                    onClick={onUnpin}
                    aria-label={t('common.close')}
                    title={t('common.close')}
                >
                    <X size={16} />
                </button>
            )}
            {hasVideoFile ? (
                <VideoPlayer
                    videoRef={videoRef}
                    src={src}
                    autoPlay={autoPlay}
                    captions={captions}
                    chapters={chapters}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={onEnded}
                    onLoadedMetadata={onLoadedMetadata}
                    showCompletion={showCompletion}
                    ambientColor={ambientColor}
                    theaterMode={theaterMode}
                    onTheaterToggle={onTheaterToggle}
                />
            ) : (
                <VideoFallback thumbnail={thumbnail} title={title} />
            )}
        </div>
    );
}

export default function VideoPlayerArea({
    readingMode, transcription, summary, isOwner, onRetryTranscription,
    getCurrentTime, videoRef, hasVideoFile, src, autoPlay, captions, chapters,
    onTimeUpdate, onEnded, onLoadedMetadata, showCompletion, ambientColor,
    thumbnail, title,
}: VideoPlayerAreaProps) {
    const isReadingMode = readingMode && transcription !== null;
    const { theaterMode, toggleTheaterMode } = usePlaybackPrefs();
    const { sentinelRef, wrapRef, pinned, reservedHeight, unpin } = usePinnedPlayer(hasVideoFile && !isReadingMode);

    return (
        <div
            className="video-page__player-area"
            style={pinned ? { minHeight: reservedHeight } : undefined}
        >
            <div ref={sentinelRef} className="video-page__player-sentinel" aria-hidden="true" />
            {/* Always mounted so the video element keeps its currentTime across mode toggles */}
            <PlayerWrap
                wrapRef={wrapRef}
                isReadingMode={isReadingMode}
                pinned={pinned}
                onUnpin={unpin}
                hasVideoFile={hasVideoFile}
                videoRef={videoRef}
                src={src}
                autoPlay={autoPlay}
                captions={captions}
                chapters={chapters}
                onTimeUpdate={onTimeUpdate}
                onEnded={onEnded}
                onLoadedMetadata={onLoadedMetadata}
                showCompletion={showCompletion}
                ambientColor={ambientColor}
                theaterMode={theaterMode}
                onTheaterToggle={toggleTheaterMode}
                thumbnail={thumbnail}
                title={title}
            />

            {isReadingMode && (
                <div className="video-page__reading-overlay">
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
                </div>
            )}
        </div>
    );
}

import type { VideoChapter } from '@api/videos';
import { DefaultVideoPlayer } from './playerDefault';
import { MiniVideoPlayer } from './playerMini';
import './player.css';

export interface VideoPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    src: string
    mode?: 'default' | 'mini'
    // Default mode
    chapters?: VideoChapter[]
    theaterMode?: boolean
    showCompletion?: boolean
    ambientColor?: string
    // Whether this player instance should capture document keyboard events
    captureKeyboard?: boolean
    // All modes
    onTimeUpdate?: () => void
    onEnded?: () => void
    onLoadedMetadata?: () => void
}

export default function VideoPlayer({
    videoRef,
    src,
    mode = 'default',
    chapters,
    theaterMode,
    onTimeUpdate,
    onEnded,
    onLoadedMetadata,
    showCompletion,
    ambientColor,
    captureKeyboard,
}: VideoPlayerProps) {
    const isMini = mode === 'mini';

    if (isMini) {
        return (
            <MiniVideoPlayer
                videoRef={videoRef}
                src={src}
                onTimeUpdate={onTimeUpdate}
                onEnded={onEnded}
                onLoadedMetadata={onLoadedMetadata}
            />
        );
    }

    return (
        <DefaultVideoPlayer
            videoRef={videoRef}
            src={src}
            chapters={chapters}
            theaterMode={theaterMode}
            showCompletion={showCompletion}
            ambientColor={ambientColor}
            captureKeyboard={captureKeyboard}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onLoadedMetadata={onLoadedMetadata}
        />
    );
}

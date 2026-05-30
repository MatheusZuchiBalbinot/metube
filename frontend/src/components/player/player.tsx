import type { VideoChapter } from '@api';
import type { VideoCaption } from '@models';
import { DefaultVideoPlayer } from './playerDefault';
import { MiniVideoPlayer } from './playerMini';
import './player.css';

export interface VideoPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    src: string
    mode?: 'default' | 'mini'
    autoPlay?: boolean
    // Default mode
    chapters?: VideoChapter[]
    captions?: VideoCaption[]
    theaterMode?: boolean
    showCompletion?: boolean
    ambientColor?: string
    // Whether this player instance should capture document keyboard events
    captureKeyboard?: boolean
    onTheaterToggle?: () => void
    // All modes
    onTimeUpdate?: () => void
    onEnded?: () => void
    onLoadedMetadata?: () => void
}

export default function VideoPlayer({
    videoRef,
    src,
    mode = 'default',
    autoPlay = true,
    chapters,
    captions,
    theaterMode,
    onTheaterToggle,
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
            autoPlay={autoPlay}
            chapters={chapters}
            captions={captions}
            theaterMode={theaterMode}
            onTheaterToggle={onTheaterToggle}
            showCompletion={showCompletion}
            ambientColor={ambientColor}
            captureKeyboard={captureKeyboard}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onLoadedMetadata={onLoadedMetadata}
        />
    );
}

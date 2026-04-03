import { Play, Pause } from 'lucide-react';
import { usePlayerPlayback } from '@hooks/usePlayerPlayback';
import { useHls } from '@hooks/useHls';
import type { VideoPlayerProps } from './player';

export function MiniVideoPlayer({
    videoRef,
    src,
    onTimeUpdate,
    onEnded,
    onLoadedMetadata,
}: Pick<VideoPlayerProps, 'videoRef' | 'src' | 'onTimeUpdate' | 'onEnded' | 'onLoadedMetadata'>) {
    const {
        isPlaying,
        currentTime,
        duration,
        handleVideoPlay,
        handleVideoPause,
        handleVideoTimeUpdate,
        handleVideoLoadedMetadata,
        handleVideoEnded,
        handleVideoProgress,
    } = usePlayerPlayback(videoRef, { onTimeUpdate, onEnded, onLoadedMetadata }, () => { }, () => { });

    // HLS streaming support
    useHls(videoRef, src);

    function handleTogglePlayImmediate() {
        const el = videoRef.current;
        if (!el) {
            return;
        }

        const isVideoPaused = el.paused;
        if (!isVideoPaused) {
            el.pause();
            return;
        }

        el.play().catch(() => { });
    }

    function handleTogglePlay(e: React.MouseEvent) {
        e.stopPropagation();
        handleTogglePlayImmediate();
    }

    function handleMiniProgressClick(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        const el = videoRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const hasDuration = el !== null && el.duration > 0;
        if (!hasDuration) {
            return;
        }

        el!.currentTime = pct * el!.duration;
    }

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="vp vp--mini" onClick={handleTogglePlayImmediate}>
            <video
                ref={videoRef}
                className="vp__video"
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onProgress={handleVideoProgress}
                onEnded={handleVideoEnded}
            />

            <div className="vp__mini-overlay">
                <button className="vp__mini-btn" onClick={handleTogglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause size={22} fill="white" strokeWidth={0} /> : <Play size={22} fill="white" strokeWidth={0} />}
                </button>
            </div>

            <div className="vp__mini-progress" aria-hidden onClick={handleMiniProgressClick}>
                <div className="vp__mini-progress-fill" style={{ transform: `scaleX(${progressPct / 100})` }} />
            </div>
        </div>
    );
}

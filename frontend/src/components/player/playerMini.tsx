import { Play, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

    const {
        isPlaying, progressPct,
        handleVideoPlay, handleVideoPause, handleVideoTimeUpdate,
        handleVideoLoadedMetadata, handleVideoEnded, handleVideoProgress,
        handleTogglePlay,
    } = usePlayerPlayback(videoRef, {
        callbacks: { onTimeUpdate, onEnded, onLoadedMetadata },
    });

    useHls(videoRef, src);

    function handleTogglePlayBtn(e: React.MouseEvent) {
        e.stopPropagation();
        handleTogglePlay();
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

    return (
        <div className="vp vp--mini" onClick={handleTogglePlay}>
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
                <button className="vp__mini-btn" onClick={handleTogglePlayBtn} aria-label={isPlaying ? t('player.pause') : t('player.play')}>
                    {isPlaying ? <Pause size={22} fill="white" strokeWidth={0} /> : <Play size={22} fill="white" strokeWidth={0} />}
                </button>
            </div>

            <div className="vp__mini-progress" aria-hidden onClick={handleMiniProgressClick}>
                <div className="vp__mini-progress-fill" style={{ transform: `scaleX(${progressPct / 100})` }} />
            </div>
        </div>
    );
}

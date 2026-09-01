import { Play, Pause } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import type { VideoPlayerProps } from './player';
import { KEYBOARD_SKIP_SECONDS } from './playerTypes';
import { usePlayerPlayback, useShaka } from '@hooks';

export function MiniVideoPlayer({
    videoRef,
    src,
    onTimeUpdate,
    onEnded,
    onLoadedMetadata,
}: Pick<VideoPlayerProps, 'videoRef' | 'src' | 'onTimeUpdate' | 'onEnded' | 'onLoadedMetadata'>) {
    const { t } = useTranslation();

    const {
        isPlaying, currentTime, duration, progressPct,
        handleVideoPlay, handleVideoPause, handleVideoTimeUpdate,
        handleVideoLoadedMetadata, handleVideoEnded, handleVideoProgress,
        handleTogglePlay,
    } = usePlayerPlayback(videoRef, {
        callbacks: { onTimeUpdate, onEnded, onLoadedMetadata },
    });

    useShaka(videoRef, src);

    function handleTogglePlayBtn(e: React.MouseEvent) {
        e.stopPropagation();
        handleTogglePlay();
    }

    function seekTo(time: number) {
        const el = videoRef.current;

        if (el === null || el.duration === 0) {
            return;
        }

        el.currentTime = Math.max(0, Math.min(time, el.duration));
    }

    function handleMiniProgressClick(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        const el = videoRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        if (el === null || el.duration === 0) {
            return;
        }

        seekTo(pct * el.duration);
    }

    function handleMiniProgressKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        e.stopPropagation();

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            seekTo(currentTime + KEYBOARD_SKIP_SECONDS);
            return;
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            seekTo(currentTime - KEYBOARD_SKIP_SECONDS);
        }
    }

    return (
        <div className="vp vp--mini">
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

            <div
                className="vp__mini-progress"
                role="slider"
                tabIndex={0}
                aria-label={t('player.mini_seek_bar')}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(currentTime)}
                onClick={handleMiniProgressClick}
                onKeyDown={handleMiniProgressKeyDown}
            >
                <div className="vp__mini-progress-fill" style={{ transform: `scaleX(${progressPct / 100})` }} />
            </div>
        </div>
    );
}

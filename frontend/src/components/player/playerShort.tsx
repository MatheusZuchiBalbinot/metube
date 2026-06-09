import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { KEYBOARD_SKIP_SECONDS } from './playerTypes';
import './player.css';
import { SkipDirection } from '@enums/skipDirection';
import { PopIconType } from '@enums/popIconType';
import {
    useShaka,
    usePlayerPlayback,
    usePlayerKeyboard,
    usePopIcon,
    useSkipIndicator,
} from '@hooks';

export interface ShortPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    src: string
    controlledMuted?: boolean
    controlledVolume?: number
    onMuteChange?: (muted: boolean) => void
    onVolumeChange?: (volume: number) => void
    onTap?: () => void
    onVideoMounted?: (el: HTMLVideoElement | null) => void
    captureKeyboard?: boolean
    onTimeUpdate?: () => void
    onEnded?: () => void
    onLoadedMetadata?: () => void
    children?: React.ReactNode
}

// eslint-disable-next-line complexity
export default function ShortPlayer({
    videoRef,
    src,
    controlledMuted,
    controlledVolume,
    onMuteChange,
    onVolumeChange: _onVolumeChange,
    onTap,
    onVideoMounted,
    captureKeyboard = false,
    onTimeUpdate,
    onEnded,
    onLoadedMetadata,
    children,
}: ShortPlayerProps) {
    const { t } = useTranslation();
    const [shortDragPct, setShortDragPct] = useState<number | null>(null);

    const handleTimeUpdate = useCallback(() => {
        setShortDragPct(null);
        onTimeUpdate?.();
    }, [onTimeUpdate]);

    const {
        isPlaying, isBuffering, progressPct,
        handleVideoPlay, handleVideoPause, handleVideoTimeUpdate,
        handleVideoLoadedMetadata, handleVideoEnded,
        handleTogglePlay, applyMuteToggle,
        setIsBuffering,
    } = usePlayerPlayback(videoRef, {
        callbacks: { onTimeUpdate: handleTimeUpdate, onEnded, onLoadedMetadata },
        controlledMuted,
        controlledVolume,
        onMuteChange,
    });

    const { popIcon, showPopIcon, resetPopIcon } = usePopIcon();
    const { skipIndicator, showSkipIndicator, resetSkipIndicator } = useSkipIndicator();

    useShaka(videoRef, src);

    // ─── Register video element with parent (ShortsPage) ──────────────────────
    useLayoutEffect(() => {
        if (!onVideoMounted) {
            return;
        }
        onVideoMounted(videoRef.current);
        return () => onVideoMounted(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Reset local state when src changes ───────────────────────────────────
    useEffect(() => {
        resetPopIcon();
        resetSkipIndicator();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset of own state when the source changes
        setShortDragPct(null);
    }, [src, resetPopIcon, resetSkipIndicator]);

    // ─── Keyboard shortcuts ───────────────────────────────────────────────────

    function handleTogglePlayWithFeedback() {
        const wasPaused = videoRef.current?.paused ?? true;
        handleTogglePlay();
        showPopIcon(wasPaused ? PopIconType.PLAY : PopIconType.PAUSE);
    }

    usePlayerKeyboard({
        videoRef,
        isDefault: false,
        captureKeyboard,
        onTogglePlay: handleTogglePlayWithFeedback,
        onSkip: showSkipIndicator,
        onVolumeChange: () => { },
        onMuteToggle: applyMuteToggle,
        onFullscreenToggle: () => { },
    });

    // ─── Event handlers ───────────────────────────────────────────────────────

    function handleTap() {
        onTap?.();
        handleTogglePlayWithFeedback();
    }

    function handleSeekStopPropagation(e: React.MouseEvent) {
        e.stopPropagation();
    }

    function handleWaiting() {
        setIsBuffering(true);
    }

    function handleCanPlay() {
        setIsBuffering(false);
    }

    function handlePlaying() {
        setIsBuffering(false);
    }

    function handleShortSeek(e: React.ChangeEvent<HTMLInputElement>) {
        e.stopPropagation();
        const el = videoRef.current;
        const val = parseFloat(e.target.value);

        if (el === null || el.duration === 0) {
            return;
        }

        setShortDragPct(val);
        el.currentTime = (val / 100) * el.duration;
    }

    const displayPct = shortDragPct !== null ? shortDragPct : progressPct;

    return (
        <div className="vp vp--short">
            <div className="vp__short-seek-track" aria-hidden>
                <div
                    className="vp__short-seek-fill"
                    style={{ transform: `scaleX(${displayPct / 100})` }}
                />
            </div>
            <input
                type="range"
                className="vp__short-seek-input"
                min={0}
                max={100}
                step={0.1}
                value={displayPct}
                onChange={handleShortSeek}
                onClick={handleSeekStopPropagation}
                aria-label={t('player.skip')}
            />

            <video
                ref={videoRef}
                className="vp__video"
                playsInline
                preload="metadata"
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onEnded={handleVideoEnded}
                onWaiting={handleWaiting}
                onCanPlay={handleCanPlay}
                onPlaying={handlePlaying}
            />

            <button
                className="vp__short-tap"
                aria-label={isPlaying ? t('player.pause') : t('player.play')}
                onClick={handleTap}
            />

            {popIcon && (
                <div className="vp__pop-icon" key={popIcon.key}>
                    {popIcon.type === 'play'
                        ? <Play size={32} fill="white" color="white" />
                        : <Pause size={32} fill="white" color="white" />
                    }
                </div>
            )}

            {skipIndicator && (
                <div
                    key={skipIndicator.key}
                    className={['vp__skip-indicator', `vp__skip-indicator--${skipIndicator.dir}`].join(' ')}
                >
                    <div className="vp__skip-indicator-icon">
                        {skipIndicator.dir === SkipDirection.FWD
                            ? <SkipForward size={26} fill="white" strokeWidth={0} />
                            : <SkipBack size={26} fill="white" strokeWidth={0} />
                        }
                    </div>
                    <span className="vp__skip-indicator-label">
                        {skipIndicator.count * KEYBOARD_SKIP_SECONDS}s
                    </span>
                </div>
            )}

            {isBuffering && (
                <div className="vp__buffering">
                    <div className="vp__buffering-spinner" />
                </div>
            )}

            {children}
        </div>
    );
}

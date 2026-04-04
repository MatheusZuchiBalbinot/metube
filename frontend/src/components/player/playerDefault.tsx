import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Volume1, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { usePlayerControls } from '@hooks/usePlayerControls';
import { usePlayerPlayback } from '@hooks/usePlayerPlayback';
import { usePlayerKeyboard } from '@hooks/usePlayerKeyboard';
import { useHls } from '@hooks/useHls';
import { usePopIcon } from '@hooks/usePopIcon';
import { useSkipIndicator } from '@hooks/useSkipIndicator';
import { useFullscreen } from '@hooks/useFullscreen';
import { useVolumeWheel } from '@hooks/useVolumeWheel';
import { useClickDoubleClick } from '@hooks/useClickDoubleClick';
import { useOutsideClick } from '@hooks/useOutsideClick';
import { Format } from '@utils/format';
import PlayerOverlays from './playerOverlays';
import PlayerSeekBar from './playerSeekBar';
import PlayerSettings from './playerSettings';
import type { VideoPlayerProps } from './player';
import { KEYBOARD_SKIP_SECONDS } from './playerTypes';

// eslint-disable-next-line complexity
export function DefaultVideoPlayer({
    videoRef,
    src,
    chapters,
    theaterMode,
    showCompletion,
    ambientColor,
    captureKeyboard,
    onTimeUpdate,
    onEnded,
    onLoadedMetadata,
}: Omit<VideoPlayerProps, 'mode'>) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    const [showSettings, setShowSettings] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // ─── Hooks ────────────────────────────────────────────────────────────────

    const {
        showControls, setShowControls,
        scheduleHideControls, revealControls, forceShow,
    } = usePlayerControls(videoRef);

    const {
        isPlaying, isBuffering, currentTime, duration,
        volume, isMuted, playbackRate, bufferedPct,
        setIsBuffering,
        handleVideoPlay, handleVideoPause, handleVideoTimeUpdate,
        handleVideoLoadedMetadata, handleVideoEnded, handleVideoProgress,
        handleTogglePlay, applyVolume, applyMuteToggle, applyPlaybackRate,
    } = usePlayerPlayback(videoRef, {
        callbacks: { onTimeUpdate, onEnded, onLoadedMetadata },
        scheduleHideControls,
        forceShowControls: forceShow,
    });

    const { popIcon, showPopIcon, resetPopIcon } = usePopIcon();
    const { skipIndicator, showSkipIndicator, resetSkipIndicator } = useSkipIndicator();
    const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

    useHls(videoRef, src);
    useVolumeWheel(containerRef, videoRef, applyVolume, revealControls);
    useOutsideClick(settingsRef, () => setShowSettings(false));

    function handleTogglePlayWithFeedback() {
        const wasPaused = videoRef.current?.paused ?? true;
        handleTogglePlay();
        showPopIcon(wasPaused ? 'play' : 'pause');
    }

    const { handleClick: handleContainerClick, handleDoubleClick: handleContainerDoubleClick } =
        useClickDoubleClick(handleTogglePlayWithFeedback, toggleFullscreen);

    const shouldCaptureKeyboard = captureKeyboard ?? true;
    usePlayerKeyboard({
        videoRef,
        isDefault: true,
        captureKeyboard: shouldCaptureKeyboard,
        onTogglePlay: handleTogglePlayWithFeedback,
        onSkip: showSkipIndicator,
        onVolumeChange: applyVolume,
        onMuteToggle: applyMuteToggle,
        onFullscreenToggle: toggleFullscreen,
    });

    // ─── Effects ──────────────────────────────────────────────────────────────

    // Reset local state when source changes
    useEffect(() => {
        resetPopIcon();
        resetSkipIndicator();
        applyPlaybackRate(1);
        setShowSettings(false);
        setIsDragging(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    // ─── Event handlers ───────────────────────────────────────────────────────

    function handleTogglePlayBtn(e: React.MouseEvent) {
        e.stopPropagation();
        handleTogglePlayWithFeedback();
    }

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
        e.stopPropagation();
        applyVolume(Number(e.target.value));
    }

    function handleToggleMute(e: React.MouseEvent) {
        e.stopPropagation();
        applyMuteToggle();
    }

    function handleSpeedChange(e: React.MouseEvent, rate: number) {
        e.stopPropagation();
        applyPlaybackRate(rate);
        setShowSettings(false);
    }

    function handleFullscreenBtn(e: React.MouseEvent) {
        e.stopPropagation();
        toggleFullscreen();
    }

    function handleToggleSettings(e: React.MouseEvent) {
        e.stopPropagation();
        setShowSettings(v => !v);
    }

    const getVolumeIcon = useCallback(() => {
        const isVolumeZero = isMuted || volume === 0;
        const isVolumeLow = !isVolumeZero && volume < 0.5;
        if (isVolumeZero) {
            return <VolumeX size={16} />;
        }

        if (isVolumeLow) {
            return <Volume1 size={16} />;
        }
        return <Volume2 size={16} />;
    }, [isMuted, volume]);

    // ─── Render ───────────────────────────────────────────────────────────────

    const wrapClass = [
        'vp',
        showControls ? 'vp--controls-visible' : '',
        (theaterMode ?? false) ? 'vp--theater' : '',
        isDragging ? 'vp--seeking' : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={wrapClass}
            ref={containerRef}
            onMouseMove={revealControls}
            onMouseLeave={() => {
                const isVideoPaused = videoRef.current?.paused ?? true;
                const shouldHide = !isVideoPaused && !isDragging;
                if (shouldHide) {
                    setShowControls(false);
                }
            }}
            style={ambientColor ? ({ '--vp-ambient': ambientColor } as React.CSSProperties) : undefined}
            onClick={handleContainerClick}
            onDoubleClick={handleContainerDoubleClick}
        >
            <video
                ref={videoRef}
                className="vp__video"
                autoPlay
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onEnded={handleVideoEnded}
                onProgress={handleVideoProgress}
                onWaiting={() => setIsBuffering(true)}
                onCanPlay={() => setIsBuffering(false)}
                onPlaying={() => setIsBuffering(false)}
            />

            <PlayerOverlays
                isBuffering={isBuffering}
                showCompletion={showCompletion}
                popIcon={popIcon}
                skipIndicator={skipIndicator}
                skipSeconds={KEYBOARD_SKIP_SECONDS}
            />

            <div className="vp__controls">
                <PlayerSeekBar
                    videoRef={videoRef}
                    src={src}
                    duration={duration}
                    bufferedPct={bufferedPct}
                    currentTime={currentTime}
                    chapters={chapters}
                    forceShow={forceShow}
                    scheduleHideControls={scheduleHideControls}
                    onDraggingChange={setIsDragging}
                />

                <div className="vp__bar" onClick={e => e.stopPropagation()}>
                    <div className="vp__bar-left">
                        <button
                            className="vp__btn"
                            onClick={handleTogglePlayBtn}
                            title={isPlaying ? t('player.pause') : t('player.play')}
                            aria-label={isPlaying ? t('player.pause') : t('player.play')}
                        >
                            {isPlaying
                                ? <Pause size={18} fill="white" strokeWidth={0} />
                                : <Play size={18} fill="white" strokeWidth={0} />
                            }
                        </button>

                        <div className="vp__volume" onClick={e => e.stopPropagation()}>
                            <button
                                className="vp__btn"
                                onClick={handleToggleMute}
                                title={isMuted ? t('player.unmute') : t('player.mute')}
                                aria-label={isMuted ? t('player.unmute') : t('player.mute')}
                            >
                                {getVolumeIcon()}
                            </button>
                            <input
                                type="range"
                                className="vp__volume-slider"
                                min="0" max="1" step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                aria-label={t('player.volume')}
                                style={{ '--vol': isMuted ? '0%' : `${volume * 100}%` } as React.CSSProperties}
                            />
                        </div>

                        <span className="vp__time">
                            {Format.duration(currentTime)} / {Format.duration(duration)}
                        </span>
                    </div>

                    <div className="vp__bar-right">
                        <PlayerSettings
                            playbackRate={playbackRate}
                            showSettings={showSettings}
                            settingsRef={settingsRef}
                            onToggle={handleToggleSettings}
                            onSpeedChange={handleSpeedChange}
                        />

                        <button
                            className="vp__btn"
                            onClick={handleFullscreenBtn}
                            title={isFullscreen ? t('player.exit_fullscreen') : t('player.fullscreen')}
                            aria-label={isFullscreen ? t('player.exit_fullscreen') : t('player.fullscreen')}
                            aria-pressed={isFullscreen}
                        >
                            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Volume1, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import type { VideoChapter } from '@data/mockSummaries';
import { usePlayerControls } from '@hooks/usePlayerControls';
import { usePlayerPlayback } from '@hooks/usePlayerPlayback';
import { usePlayerKeyboard } from '@hooks/usePlayerKeyboard';
import { useHls } from '@hooks/useHls';
import PlayerOverlays from './playerOverlays';
import PlayerSeekBar from './playerSeekBar';
import PlayerSettings from './playerSettings';
import './player.css';

// Maximum interval between two clicks to be treated as a double-click (ms).
const DOUBLE_CLICK_DELAY_MS = 200;

// Seconds skipped per keyboard arrow press — also shown in the skip indicator.
const KEYBOARD_SKIP_SECONDS = 5;

type SkipIndicator = { dir: 'fwd' | 'bwd'; count: number; key: number };

function formatTime(s: number): string {
    const isInvalid = !Number.isFinite(s) || s < 0;
    if (isInvalid) {
        return '0:00';
    }
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const ss = String(sec).padStart(2, '0');
    const hasHours = h > 0;
    if (hasHours) {
        return `${h}:${String(m).padStart(2, '0')}:${ss}`;
    }
    return `${m}:${ss}`;
}

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
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);
    const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const popAnimKeyRef = useRef(0);
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipAnimKeyRef = useRef(0);

    const isMini = mode === 'mini';
    const isDefault = !isMini;

    // ─── Extracted hooks ───────────────────────────────────────────────────────

    const {
        showControls, setShowControls,
        scheduleHideControls, revealControls, forceShow,
    } = usePlayerControls(videoRef);

    const {
        isPlaying, isBuffering, currentTime, duration,
        volume, isMuted, playbackRate, bufferedPct,
        setIsPlaying, setIsBuffering, setCurrentTime, setDuration, setBufferedPct,
        handleVideoPlay, handleVideoPause, handleVideoTimeUpdate,
        handleVideoLoadedMetadata, handleVideoEnded, handleVideoProgress,
        applyVolume, applyMuteToggle, applyPlaybackRate,
    } = usePlayerPlayback(videoRef, { onTimeUpdate, onEnded, onLoadedMetadata }, scheduleHideControls, forceShow);

    // HLS streaming support: handles adaptive bitrate with fallback to native/direct playback
    useHls(videoRef, src);

    // ─── Local UI state ────────────────────────────────────────────────────────

    const [isFullscreen, setIsFullscreen] = useState(false);
    // isDragging is owned by PlayerSeekBar but lifted up for the CSS class and
    // the onMouseLeave guard.
    const [isDragging, setIsDragging] = useState(false);
    const [popIcon, setPopIcon] = useState<{ type: 'play' | 'pause'; key: number } | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [skipIndicator, setSkipIndicator] = useState<SkipIndicator | null>(null);

    // ─── Keyboard hook (uses hoisted function declarations below) ──────────────

    const shouldCaptureKeyboard = captureKeyboard ?? isDefault;
    usePlayerKeyboard({
        videoRef,
        isDefault,
        captureKeyboard: shouldCaptureKeyboard,
        onTogglePlay: handleTogglePlayImmediate,
        onSkip: showSkipIndicator,
        onVolumeChange: applyVolume,
        onMuteToggle: applyMuteToggle,
        onFullscreenToggle: handleFullscreenToggle,
    });

    // ─── Helper functions ──────────────────────────────────────────────────────

    function showPopIcon(type: 'play' | 'pause') {
        if (popTimerRef.current) {
            clearTimeout(popTimerRef.current);
        }
        popAnimKeyRef.current += 1;
        setPopIcon({ type, key: popAnimKeyRef.current });
        popTimerRef.current = setTimeout(() => setPopIcon(null), 500);
    }

    function showSkipIndicator(dir: 'fwd' | 'bwd') {
        skipAnimKeyRef.current += 1;
        const key = skipAnimKeyRef.current;
        if (skipTimerRef.current) {
            clearTimeout(skipTimerRef.current);
        }
        setSkipIndicator(prev => ({
            dir,
            count: prev?.dir === dir ? prev.count + 1 : 1,
            key,
        }));
        skipTimerRef.current = setTimeout(() => setSkipIndicator(null), 800);
    }

    function handleFullscreenToggle() {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        } else {
            container.requestFullscreen().catch(() => { });
        }
    }

    // ─── Effects ───────────────────────────────────────────────────────────────

    // Cleanup animation timers on unmount
    useEffect(() => {
        return () => {
            if (popTimerRef.current) {
                clearTimeout(popTimerRef.current);
            }

            if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current);
            }

            if (skipTimerRef.current) {
                clearTimeout(skipTimerRef.current);
            }
        };
    }, []);

    // Reset playback state when the video source changes.
    // Seek/drag state is reset inside PlayerSeekBar (it watches src too).
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        applyPlaybackRate(1);
        setPopIcon(null);
        setShowSettings(false);
        setBufferedPct(0);
        setIsDragging(false);
        setIsBuffering(false);
        setSkipIndicator(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    // Close settings panel when clicking outside (default mode only)
    useEffect(() => {
        if (!isDefault) {
            return;
        }
        function handleOutsideClick(e: MouseEvent) {
            const isOutside = settingsRef.current && !settingsRef.current.contains(e.target as Node);
            if (isOutside) {
                setShowSettings(false);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Mouse wheel to control volume (default mode only)
    useEffect(() => {
        if (!isDefault) {
            return;
        }
        const container = containerRef.current;
        if (!container) {
            return;
        }
        function onWheel(e: WheelEvent) {
            const el = videoRef.current;
            if (!el) {
                return;
            }
            const delta = e.deltaY < 0 ? 0.05 : -0.05;
            const newVol = Math.min(1, Math.max(0, el.volume + delta));
            applyVolume(newVol);
            revealControls();
        }
        container.addEventListener('wheel', onWheel, { passive: true });
        return () => container.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDefault]);

    // Fullscreen change listener
    useEffect(() => {
        function onFsChange() {
            setIsFullscreen(document.fullscreenElement !== null);
        }
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // ─── Event handlers ────────────────────────────────────────────────────────

    function handleTogglePlayImmediate() {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        const isVideoPaused = el.paused;
        if (isVideoPaused) {
            el.play().catch(() => { }); showPopIcon('play');
        } else {
            el.pause(); showPopIcon('pause');
        }
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

    function handleContainerClick() {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
        }
        clickTimerRef.current = setTimeout(() => {
            handleTogglePlayImmediate();
        }, DOUBLE_CLICK_DELAY_MS);
    }

    function handleContainerDoubleClick() {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current); clickTimerRef.current = null;
        }
        handleFullscreenToggle();
    }

    function handleTogglePlay(e: React.MouseEvent) {
        e.stopPropagation();
        handleTogglePlayImmediate();
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

    function handleTheaterToggle(e: React.MouseEvent) {
        e.stopPropagation();
        handleFullscreenToggle();
    }

    function handleToggleSettings(e: React.MouseEvent) {
        e.stopPropagation();
        setShowSettings(v => !v);
    }

    function getVolumeIcon() {
        const isVolumeZero = isMuted || volume === 0;
        const isVolumeLow = !isVolumeZero && volume < 0.5;
        if (isVolumeZero) {
            return <VolumeX size={16} />;
        }

        if (isVolumeLow) {
            return <Volume1 size={16} />;
        }
        return <Volume2 size={16} />;
    }

    // ─── Mini mode render ──────────────────────────────────────────────────────

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (isMini) {
        return (
            <div className="vp vp--mini" ref={containerRef} onClick={handleTogglePlayImmediate}>
                <video
                    ref={videoRef}
                    className="vp__video"
                    onPlay={handleVideoPlay}
                    onPause={handleVideoPause}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onProgress={handleVideoProgress}
                    onEnded={handleVideoEnded}
                    onWaiting={() => setIsBuffering(true)}
                    onCanPlay={() => setIsBuffering(false)}
                    onPlaying={() => setIsBuffering(false)}
                />

                <div className="vp__mini-overlay">
                    <button
                        className="vp__mini-btn"
                        onClick={handleTogglePlay}
                        aria-label={isPlaying ? t('player.pause') : t('player.play')}
                    >
                        {isPlaying
                            ? <Pause size={22} fill="white" strokeWidth={0} />
                            : <Play size={22} fill="white" strokeWidth={0} />
                        }
                    </button>
                </div>

                <div className="vp__mini-progress" aria-hidden onClick={handleMiniProgressClick}>
                    <div className="vp__mini-progress-fill" style={{ transform: `scaleX(${progressPct / 100})` }} />
                </div>
            </div>
        );
    }

    // ─── Default mode render ───────────────────────────────────────────────────

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
                            onClick={handleTogglePlay}
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
                            {formatTime(currentTime)} / {formatTime(duration)}
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
                            onClick={handleTheaterToggle}
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

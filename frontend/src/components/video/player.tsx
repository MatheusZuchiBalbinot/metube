import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Volume1, Volume2, VolumeX, SkipForward, SkipBack, Maximize2, Minimize2, Maximize, Minimize, Settings, Check } from 'lucide-react';
import type { VideoChapter } from '@data/mockSummaries';
import './player.css';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const HIDE_CONTROLS_DELAY_MS = 3000;
const DOUBLE_CLICK_DELAY_MS = 200;
const KEYBOARD_SKIP_SECONDS = 5;
const PREVIEW_W = 160;
const PREVIEW_HALF_W = PREVIEW_W / 2;

type SkipIndicator = { dir: 'fwd' | 'bwd'; count: number; key: number };

function formatTime(s: number): string {
    const isInvalid = !Number.isFinite(s) || s < 0;
    if (isInvalid) { return '0:00'; }
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const ss = String(sec).padStart(2, '0');
    const hasHours = h > 0;
    if (hasHours) { return `${h}:${String(m).padStart(2, '0')}:${ss}`; }
    return `${m}:${ss}`;
}

function parseChapterTimestamp(ts: string): number {
    const parts = ts.split(':').map(Number);
    const isHMS = parts.length === 3;
    if (isHMS) { return parts[0] * 3600 + parts[1] * 60 + parts[2]; }
    return parts[0] * 60 + (parts[1] ?? 0);
}

export interface VideoPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    src: string
    chapters?: VideoChapter[]
    theaterMode: boolean
    onToggleTheater: () => void
    onTimeUpdate?: () => void
    onEnded?: () => void
    onLoadedMetadata?: () => void
    showCompletion?: boolean
    ambientColor?: string
}

// eslint-disable-next-line complexity
export default function VideoPlayer({
    videoRef,
    src,
    chapters,
    theaterMode,
    onToggleTheater,
    onTimeUpdate,
    onEnded,
    onLoadedMetadata,
    showCompletion,
    ambientColor,
}: VideoPlayerProps) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const seekInnerRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipAnimKeyRef = useRef(0);
    const wasDraggingRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hoverSeekPct, setHoverSeekPct] = useState<number | null>(null);
    const [popIcon, setPopIcon] = useState<{ type: 'play' | 'pause'; key: number } | null>(null);
    const popAnimKeyRef = useRef(0);
    const [showSettings, setShowSettings] = useState(false);
    const [bufferedPct, setBufferedPct] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPct, setDragPct] = useState<number | null>(null);
    const [isBuffering, setIsBuffering] = useState(false);
    const [skipIndicator, setSkipIndicator] = useState<SkipIndicator | null>(null);
    const [seekInnerWidth, setSeekInnerWidth] = useState(0);

    function showPopIcon(type: 'play' | 'pause') {
        if (popTimerRef.current) { clearTimeout(popTimerRef.current); }
        popAnimKeyRef.current += 1;
        setPopIcon({ type, key: popAnimKeyRef.current });
        popTimerRef.current = setTimeout(() => setPopIcon(null), 500);
    }

    function showSkipIndicator(dir: 'fwd' | 'bwd') {
        skipAnimKeyRef.current += 1;
        const key = skipAnimKeyRef.current;
        if (skipTimerRef.current) { clearTimeout(skipTimerRef.current); }
        setSkipIndicator(prev => ({
            dir,
            count: prev?.dir === dir ? prev.count + 1 : 1,
            key,
        }));
        skipTimerRef.current = setTimeout(() => setSkipIndicator(null), 800);
    }

    function scheduleHideControls() {
        if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); }
        hideTimerRef.current = setTimeout(() => {
            const isVideoPaused = videoRef.current?.paused ?? true;
            if (!isVideoPaused) { setShowControls(false); }
        }, HIDE_CONTROLS_DELAY_MS);
    }

    function revealControls() {
        setShowControls(true);
        scheduleHideControls();
    }

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); }
            if (popTimerRef.current) { clearTimeout(popTimerRef.current); }
            if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); }
            if (skipTimerRef.current) { clearTimeout(skipTimerRef.current); }
        };
    }, []);

    // Reset internal state when video source changes
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setPlaybackRate(1);
        setHoverSeekPct(null);
        setPopIcon(null);
        setShowSettings(false);
        setBufferedPct(0);
        setIsDragging(false);
        setDragPct(null);
        setIsBuffering(false);
        setSkipIndicator(null);
        wasDraggingRef.current = false;
        const canvas = previewCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [src]);

    // Track seek inner width for precise preview arrow alignment
    useEffect(() => {
        const el = seekInnerRef.current;
        if (!el) { return; }
        const ro = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) { setSeekInnerWidth(entry.contentRect.width); }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Seek preview video to hover time so canvas can capture the frame
    useEffect(() => {
        const pv = previewVideoRef.current;
        const hasHover = hoverSeekPct !== null && duration > 0;
        if (!pv || !hasHover) { return; }
        pv.currentTime = hoverSeekPct! * duration;
    }, [hoverSeekPct, duration]);

    // Close settings panel when clicking outside
    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            const isOutside = settingsRef.current && !settingsRef.current.contains(e.target as Node);
            if (isOutside) { setShowSettings(false); }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Mouse wheel to control volume — native (non-passive) listener to allow preventDefault
    useEffect(() => {
        const container = containerRef.current;
        if (!container) { return; }

        function onWheel(e: WheelEvent) {
            const el = videoRef.current;
            if (!el) { return; }
            const delta = e.deltaY < 0 ? 0.05 : -0.05;
            const newVol = Math.min(1, Math.max(0, el.volume + delta));
            el.volume = newVol;
            setVolume(newVol);
            const shouldUnmute = newVol > 0 && el.muted;
            if (shouldUnmute) { el.muted = false; setIsMuted(false); }
            // Reveal controls so user sees volume change
            setShowControls(true);
            if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); }
            hideTimerRef.current = setTimeout(() => {
                const isPaused = videoRef.current?.paused ?? true;
                if (!isPaused) { setShowControls(false); }
            }, HIDE_CONTROLS_DELAY_MS);
        }

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Drag-to-seek — register document listeners while dragging
    useEffect(() => {
        if (!isDragging) { return; }

        if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); }
        setShowControls(true);

        function getPctFromEvent(e: MouseEvent): number {
            const inner = seekInnerRef.current;
            if (!inner) { return 0; }
            const rect = inner.getBoundingClientRect();
            return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        }

        function onMouseMove(e: MouseEvent) {
            const pct = getPctFromEvent(e);
            setDragPct(pct);
            setHoverSeekPct(pct);
        }

        function onMouseUp(e: MouseEvent) {
            const el = videoRef.current;
            if (el && el.duration > 0) {
                el.currentTime = getPctFromEvent(e) * el.duration;
            }
            wasDraggingRef.current = true;
            setIsDragging(false);
            setDragPct(null);
            setHoverSeekPct(null);
            scheduleHideControls();
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging, videoRef]);

    // Keyboard shortcuts
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const el = videoRef.current;
            if (!el) { return; }
            const target = e.target as HTMLElement;
            // Never intercept while typing
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
                || target.isContentEditable;
            if (isTyping) { return; }

            // Space: always toggle play/pause; e.preventDefault() suppresses both
            // page scroll and the browser's native Space handler on <video>/<button>
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                const isVideoPaused = el.paused;
                if (isVideoPaused) { el.play().catch(() => { }); showPopIcon('play'); }
                else { el.pause(); showPopIcon('pause'); }
                return;
            }

            // For all other shortcuts, skip when a button/link has focus
            const isInteractive = ['BUTTON', 'A'].includes(target.tagName);
            if (isInteractive) { return; }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                el.currentTime = Math.min(el.currentTime + KEYBOARD_SKIP_SECONDS, el.duration);
                showSkipIndicator('fwd');
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                el.currentTime = Math.max(el.currentTime - KEYBOARD_SKIP_SECONDS, 0);
                showSkipIndicator('bwd');
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const newVol = Math.min(el.volume + 0.1, 1);
                el.volume = newVol;
                setVolume(newVol);
                const shouldUnmute = newVol > 0 && el.muted;
                if (shouldUnmute) { el.muted = false; setIsMuted(false); }
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const newVol = Math.max(el.volume - 0.1, 0);
                el.volume = newVol;
                setVolume(newVol);
                return;
            }
            if (e.key === 'm' || e.key === 'M') {
                el.muted = !el.muted;
                setIsMuted(el.muted);
                return;
            }
            if (e.key === 'f' || e.key === 'F') {
                const container = containerRef.current;
                if (!container) { return; }
                if (document.fullscreenElement) { document.exitFullscreen().catch(() => { }); }
                else { container.requestFullscreen().catch(() => { }); }
                return;
            }
            if (e.key === 't' || e.key === 'T') {
                onToggleTheater();
            }
        }
        // Capture phase so our handler fires before the video element's native Space handler
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [videoRef, containerRef, onToggleTheater]);

    const handleVideoPlay = useCallback(() => {
        setIsPlaying(true);
        setIsBuffering(false);
        scheduleHideControls();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleVideoPause = useCallback(() => {
        setIsPlaying(false);
        setShowControls(true);
        if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); }
    }, []);

    const handleVideoTimeUpdate = useCallback(() => {
        const el = videoRef.current;
        if (!el) { return; }
        setCurrentTime(el.currentTime);
        onTimeUpdate?.();
    }, [videoRef, onTimeUpdate]);

    const handleVideoLoadedMetadata = useCallback(() => {
        const el = videoRef.current;
        if (!el) { return; }
        setDuration(el.duration);
        onLoadedMetadata?.();
    }, [videoRef, onLoadedMetadata]);

    const handleVideoEnded = useCallback(() => {
        setIsPlaying(false);
        setShowControls(true);
        onEnded?.();
    }, [onEnded]);

    const handleVideoProgress = useCallback(() => {
        const el = videoRef.current;
        const hasDuration = el && el.duration > 0 && el.buffered.length > 0;
        if (!hasDuration) { return; }
        const bufferedEnd = el.buffered.end(el.buffered.length - 1);
        setBufferedPct((bufferedEnd / el.duration) * 100);
    }, [videoRef]);

    function handlePreviewSeeked() {
        const pv = previewVideoRef.current;
        const canvas = previewCanvasRef.current;
        if (!pv || !canvas) { return; }
        const ctx = canvas.getContext('2d');
        if (!ctx) { return; }
        try {
            ctx.drawImage(pv, 0, 0, canvas.width, canvas.height);
        } catch {
            // CORS or decode error — canvas stays black, time label still shows
        }
    }

    useEffect(() => {
        function onFsChange() {
            setIsFullscreen(document.fullscreenElement !== null);
        }
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    function handleTogglePlayImmediate() {
        const el = videoRef.current;
        if (!el) { return; }
        const isVideoPaused = el.paused;
        if (isVideoPaused) { el.play().catch(() => { }); showPopIcon('play'); }
        else { el.pause(); showPopIcon('pause'); }
    }

    function handleContainerClick() {
        if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); }
        clickTimerRef.current = setTimeout(() => {
            handleTogglePlayImmediate();
        }, DOUBLE_CLICK_DELAY_MS);
    }

    function handleContainerDoubleClick() {
        if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
        const container = containerRef.current;
        if (!container) { return; }
        if (document.fullscreenElement) { document.exitFullscreen().catch(() => { }); }
        else { container.requestFullscreen().catch(() => { }); }
    }

    function handleTogglePlay(e: React.MouseEvent) {
        e.stopPropagation();
        handleTogglePlayImmediate();
    }

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
        e.stopPropagation();
        const el = videoRef.current;
        const v = Number(e.target.value);
        setVolume(v);
        const shouldMute = v === 0;
        setIsMuted(shouldMute);
        if (el) {
            el.volume = v;
            el.muted = shouldMute;
        }
    }

    function handleToggleMute(e: React.MouseEvent) {
        e.stopPropagation();
        const el = videoRef.current;
        if (!el) { return; }
        const newMuted = !isMuted;
        el.muted = newMuted;
        setIsMuted(newMuted);
    }

    function handleSpeedChange(e: React.MouseEvent, rate: number) {
        e.stopPropagation();
        const el = videoRef.current;
        setPlaybackRate(rate);
        if (el) { el.playbackRate = rate; }
    }

    function handleToggleFullscreen(e: React.MouseEvent) {
        e.stopPropagation();
        const container = containerRef.current;
        if (!container) { return; }
        const isCurrentlyFull = document.fullscreenElement !== null;
        if (isCurrentlyFull) {
            document.exitFullscreen().catch(() => { });
        } else {
            container.requestFullscreen().catch(() => { });
        }
    }

    function handleTheaterToggle(e: React.MouseEvent) {
        e.stopPropagation();
        onToggleTheater();
    }

    function handleToggleSettings(e: React.MouseEvent) {
        e.stopPropagation();
        setShowSettings(v => !v);
    }

    function getSeekPct(e: React.MouseEvent<HTMLDivElement>): number {
        const inner = seekInnerRef.current;
        if (!inner) { return 0; }
        const rect = inner.getBoundingClientRect();
        return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    }

    function handleSeekClick(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        if (wasDraggingRef.current) { wasDraggingRef.current = false; return; }
        const el = videoRef.current;
        const hasDuration = duration > 0;
        if (!el || !hasDuration) { return; }
        el.currentTime = getSeekPct(e) * duration;
    }

    function handleSeekMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();
        const pct = getSeekPct(e);
        setIsDragging(true);
        setDragPct(pct);
        setHoverSeekPct(pct);
    }

    function handleSeekMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!isDragging) { setHoverSeekPct(getSeekPct(e)); }
    }

    function handleSeekMouseLeave() {
        if (!isDragging) { setHoverSeekPct(null); }
    }

    function getVolumeIcon() {
        const isVolumeZero = isMuted || volume === 0;
        const isVolumeLow = !isVolumeZero && volume < 0.5;
        if (isVolumeZero) { return <VolumeX size={16} />; }
        if (isVolumeLow) { return <Volume1 size={16} />; }
        return <Volume2 size={16} />;
    }

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const displayPct = isDragging && dragPct !== null ? dragPct * 100 : progressPct;
    const activePct = hoverSeekPct !== null ? hoverSeekPct * 100 : displayPct;
    const hasChapters = !!chapters && chapters.length > 0 && duration > 0;
    const showHoverElements = hoverSeekPct !== null || isDragging;

    // Preview arrow alignment — compensates for CSS clamp on the popup position
    const activePixel = seekInnerWidth > 0 ? (activePct / 100) * seekInnerWidth : 0;
    const maxClamp = Math.max(seekInnerWidth - PREVIEW_HALF_W, PREVIEW_HALF_W);
    const clampedPixel = Math.min(Math.max(activePixel, PREVIEW_HALF_W), maxClamp);
    const arrowOffset = activePixel - clampedPixel;
    const arrowLeftPct = Math.min(Math.max(50 + (arrowOffset / PREVIEW_W) * 100, 8), 92);

    const hoverTime = (hoverSeekPct !== null ? hoverSeekPct : (dragPct ?? 0)) * duration;

    const wrapClass = [
        'vp',
        showControls ? 'vp--controls-visible' : '',
        theaterMode ? 'vp--theater' : '',
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
                if (shouldHide) { setShowControls(false); }
            }}
            style={ambientColor ? ({ '--vp-ambient': ambientColor } as React.CSSProperties) : undefined}
            onClick={handleContainerClick}
            onDoubleClick={handleContainerDoubleClick}
        >
            <video
                ref={videoRef}
                className="vp__video"
                src={src}
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

            {/* Hidden video for frame capture without disturbing playback */}
            <video
                ref={previewVideoRef}
                className="vp__preview-video"
                src={src}
                muted
                preload="metadata"
                onSeeked={handlePreviewSeeked}
            />

            {/* Buffering spinner */}
            {isBuffering && !showCompletion && (
                <div className="vp__buffering">
                    <div className="vp__buffering-spinner" />
                </div>
            )}

            {/* Play/Pause flash icon */}
            {popIcon && (
                <div className="vp__pop-icon" key={popIcon.key}>
                    {popIcon.type === 'play'
                        ? <Play size={52} fill="white" color="white" />
                        : <Pause size={52} fill="white" color="white" />
                    }
                </div>
            )}

            {/* Keyboard skip indicator */}
            {skipIndicator && (
                <div
                    key={skipIndicator.key}
                    className={['vp__skip-indicator', `vp__skip-indicator--${skipIndicator.dir}`].join(' ')}
                >
                    <div className="vp__skip-indicator-icon">
                        {skipIndicator.dir === 'fwd'
                            ? <SkipForward size={26} fill="white" strokeWidth={0} />
                            : <SkipBack size={26} fill="white" strokeWidth={0} />
                        }
                    </div>
                    <span className="vp__skip-indicator-label">
                        {skipIndicator.count * KEYBOARD_SKIP_SECONDS}s
                    </span>
                </div>
            )}

            {/* Completion overlay */}
            {showCompletion && (
                <div className="vp__completion">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" className="vp__completion-icon">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}

            {/* Controls overlay */}
            <div className="vp__controls">

                {/* Seek bar */}
                <div
                    className="vp__seek"
                    onClick={handleSeekClick}
                    onMouseDown={handleSeekMouseDown}
                    onMouseMove={handleSeekMouseMove}
                    onMouseLeave={handleSeekMouseLeave}
                >
                    <div className="vp__seek-inner" ref={seekInnerRef}>
                        <div className="vp__seek-track">
                            <div className="vp__seek-buffered" style={{ width: `${bufferedPct}%` }} />
                            <div className="vp__seek-fill" style={{ width: `${displayPct}%` }} />
                        </div>

                        {/* Chapter dots — click navigates to the exact chapter timestamp */}
                        {hasChapters && chapters!.map((ch, i) => {
                            const chPct = (parseChapterTimestamp(ch.timestamp) / duration) * 100;
                            const isVisible = chPct > 0.5 && chPct < 99.5;
                            if (!isVisible) { return null; }
                            return (
                                <div
                                    key={i}
                                    className="vp__chapter-dot"
                                    style={{ left: `${chPct}%` }}
                                    title={ch.title}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const el = videoRef.current;
                                        if (!el) { return; }
                                        el.currentTime = parseChapterTimestamp(ch.timestamp);
                                    }}
                                />
                            );
                        })}

                        {/* Thumb at current playback / drag position */}
                        <div className="vp__seek-thumb vp__seek-thumb--current" style={{ left: `${displayPct}%` }} />

                        {/* Preview popup — video frame + timestamp */}
                        {showHoverElements && duration > 0 && (
                            <div
                                className="vp__seek-preview"
                                style={{
                                    '--preview-left': `${activePct}%`,
                                    '--arrow-left': `${arrowLeftPct}%`,
                                } as React.CSSProperties}
                            >
                                <canvas
                                    ref={previewCanvasRef}
                                    className="vp__seek-preview-canvas"
                                    width={160}
                                    height={90}
                                />
                                <span className="vp__seek-preview-time">
                                    {formatTime(hoverTime)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom bar */}
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

                        {/* Inline volume control */}
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

                        {/* Settings button + panel (speed only) */}
                        <div className="vp__settings" ref={settingsRef}>
                            {showSettings && (
                                <div className="vp__settings-panel" onClick={e => e.stopPropagation()}>
                                    <div className="vp__settings-section">
                                        <span className="vp__settings-section-label">{t('player.speed')}</span>
                                        <div
                                            className="vp__settings-speeds"
                                            role="listbox"
                                            aria-label={t('player.speed')}
                                        >
                                            {SPEED_OPTIONS.map(rate => {
                                                const isActive = playbackRate === rate;
                                                const optClass = [
                                                    'vp__settings-option',
                                                    isActive ? 'vp__settings-option--active' : '',
                                                ].filter(Boolean).join(' ');
                                                return (
                                                    <button
                                                        key={rate}
                                                        className={optClass}
                                                        onClick={e => { handleSpeedChange(e, rate); setShowSettings(false); }}
                                                        role="option"
                                                        aria-selected={isActive}
                                                    >
                                                        <span>{rate === 1 ? '1×' : `${rate}×`}</span>
                                                        {isActive && <Check size={12} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                className="vp__btn"
                                onClick={handleToggleSettings}
                                title={t('player.settings')}
                                aria-label={t('player.settings')}
                                aria-expanded={showSettings}
                                aria-haspopup="true"
                            >
                                <Settings size={16} />
                            </button>
                        </div>

                        <button
                            className="vp__btn"
                            onClick={handleTheaterToggle}
                            title={theaterMode ? t('player.exit_theater') : t('player.theater')}
                            aria-label={theaterMode ? t('player.exit_theater') : t('player.theater')}
                            aria-pressed={theaterMode}
                        >
                            {theaterMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>

                        <button
                            className="vp__btn"
                            onClick={handleToggleFullscreen}
                            title={isFullscreen ? t('player.exit_fullscreen') : t('player.fullscreen')}
                            aria-label={isFullscreen ? t('player.exit_fullscreen') : t('player.fullscreen')}
                        >
                            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

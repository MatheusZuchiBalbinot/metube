import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { useHls } from '@hooks/useHls';
import '../player/player.css';

const KEYBOARD_SKIP_SECONDS = 5;

type SkipIndicator = { dir: 'fwd' | 'bwd'; count: number; key: number };

export interface ShortPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    src: string
    // Volume and mute are controlled by the parent (ShortsPage) so they persist
    // as the user scrolls between shorts items.
    controlledMuted?: boolean
    controlledVolume?: number
    onMuteChange?: (muted: boolean) => void
    onVolumeChange?: (volume: number) => void
    // Called when the tap overlay is clicked (before play/pause toggle).
    onTap?: () => void
    // Called when the video element mounts/unmounts for parent registration.
    onVideoMounted?: (el: HTMLVideoElement | null) => void
    // Whether this instance captures document keyboard events.
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

    const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const popAnimKeyRef = useRef(0);
    const skipAnimKeyRef = useRef(0);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [_isMuted, setIsMuted] = useState(controlledMuted ?? true);
    const [isBuffering, setIsBuffering] = useState(false);
    const [popIcon, setPopIcon] = useState<{ type: 'play' | 'pause'; key: number } | null>(null);
    const [skipIndicator, setSkipIndicator] = useState<SkipIndicator | null>(null);
    const [shortDragPct, setShortDragPct] = useState<number | null>(null);

    // ─── Register video element with parent (ShortsPage) ──────────────────────
    useLayoutEffect(() => {
        if (!onVideoMounted) {
            return;
        }
        onVideoMounted(videoRef.current);
        return () => onVideoMounted(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Sync controlled muted from parent ────────────────────────────────────
    useEffect(() => {
        const hasValue = controlledMuted !== undefined;
        if (!hasValue) {
            return;
        }
        setIsMuted(controlledMuted!);
        const el = videoRef.current;
        if (el) {
            el.muted = controlledMuted!;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controlledMuted]);

    // ─── Sync controlled volume from parent ───────────────────────────────────
    useEffect(() => {
        const hasValue = controlledVolume !== undefined;
        if (!hasValue) {
            return;
        }
        const el = videoRef.current;
        if (el) {
            el.volume = controlledVolume!;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controlledVolume]);

    // ─── Reset state when src changes ─────────────────────────────────────────
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setPopIcon(null);
        setSkipIndicator(null);
        setShortDragPct(null);
    }, [src]);

    // ─── Timer cleanup ────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (popTimerRef.current) {
                clearTimeout(popTimerRef.current);
            }

            if (skipTimerRef.current) {
                clearTimeout(skipTimerRef.current);
            }
        };
    }, []);

    // HLS streaming support: handles adaptive bitrate with fallback to native/direct playback
    useHls(videoRef, src);

    // ─── Keyboard shortcuts ────────────────────────────────────────────────────

    function handlePlayPause(el: HTMLVideoElement) {
        const isVideoPaused = el.paused;
        if (isVideoPaused) {
            el.play().catch(() => { }); showPopIcon('play');
        } else {
            el.pause(); showPopIcon('pause');
        }
    }

    function handleMuteToggle(el: HTMLVideoElement) {
        const newMuted = !el.muted;
        el.muted = newMuted;
        setIsMuted(newMuted);
        onMuteChange?.(newMuted);
    }

    function handleKeyboardShortcuts(el: HTMLVideoElement, e: KeyboardEvent) {
        const handlers: Record<string, () => void> = {
            ' ': () => {
                e.preventDefault();
                handlePlayPause(el);
            },
            'Code': () => {
                e.preventDefault();
                handlePlayPause(el);
            },
            'ArrowRight': () => {
                e.preventDefault();
                el.currentTime = Math.min(el.currentTime + KEYBOARD_SKIP_SECONDS, el.duration);
                showSkipIndicator('fwd');
            },
            'ArrowLeft': () => {
                e.preventDefault();
                el.currentTime = Math.max(el.currentTime - KEYBOARD_SKIP_SECONDS, 0);
                showSkipIndicator('bwd');
            },
            'm': () => {
                handleMuteToggle(el);
            },
            'M': () => {
                handleMuteToggle(el);
            },
        };

        const handler = handlers[e.key];
        if (handler) {
            handler();
        }
    }

    useEffect(() => {
        if (!captureKeyboard) {
            return;
        }

        function onKeyDown(e: KeyboardEvent) {
            const el = videoRef.current;
            if (!el) {
                return;
            }

            const target = e.target as HTMLElement;
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
            if (isTyping) {
                return;
            }

            handleKeyboardShortcuts(el, e);
        }

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [captureKeyboard, onMuteChange]);

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

    // ─── Video event handlers ─────────────────────────────────────────────────

    const handleVideoPlay = useCallback(() => {
        setIsPlaying(true);
        setIsBuffering(false);
    }, []);

    const handleVideoPause = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const handleVideoTimeUpdate = useCallback(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        setCurrentTime(el.currentTime);
        setShortDragPct(null);
        onTimeUpdate?.();
    }, [videoRef, onTimeUpdate]);

    const handleVideoLoadedMetadata = useCallback(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        setDuration(el.duration);
        onLoadedMetadata?.();
    }, [videoRef, onLoadedMetadata]);

    const handleVideoEnded = useCallback(() => {
        setIsPlaying(false);
        onEnded?.();
    }, [onEnded]);

    function handleTap() {
        onTap?.();
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

    function handleShortSeek(e: React.ChangeEvent<HTMLInputElement>) {
        e.stopPropagation();
        const el = videoRef.current;
        const val = parseFloat(e.target.value);
        const hasDuration = el !== null && el.duration > 0;
        if (!hasDuration) {
            return;
        }
        setShortDragPct(val);
        el!.currentTime = (val / 100) * el!.duration;
    }

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="vp vp--short">
            {/* Interactive seek bar at top */}
            <div className="vp__short-seek-track" aria-hidden>
                <div
                    className="vp__short-seek-fill"
                    style={{ transform: `scaleX(${(shortDragPct !== null ? shortDragPct : progressPct) / 100})` }}
                />
            </div>
            <input
                type="range"
                className="vp__short-seek-input"
                min={0}
                max={100}
                step={0.1}
                value={shortDragPct !== null ? shortDragPct : progressPct}
                onChange={handleShortSeek}
                onClick={e => e.stopPropagation()}
                aria-label={t('player.skip')}
            />

            {/* Video element */}
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
                onWaiting={() => setIsBuffering(true)}
                onCanPlay={() => setIsBuffering(false)}
                onPlaying={() => setIsBuffering(false)}
            />

            {/* Tap overlay */}
            <button
                className="vp__short-tap"
                aria-label={isPlaying ? t('player.pause') : t('player.play')}
                onClick={handleTap}
            />

            {/* Play/pause pop icon */}
            {popIcon && (
                <div className="vp__pop-icon" key={popIcon.key}>
                    {popIcon.type === 'play'
                        ? <Play size={32} fill="white" color="white" />
                        : <Pause size={32} fill="white" color="white" />
                    }
                </div>
            )}

            {/* Skip indicator */}
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

            {/* Buffering spinner */}
            {isBuffering && (
                <div className="vp__buffering">
                    <div className="vp__buffering-spinner" />
                </div>
            )}

            {/* Overlay content (channel, title, tags, description panel, counter) */}
            {children}
        </div>
    );
}

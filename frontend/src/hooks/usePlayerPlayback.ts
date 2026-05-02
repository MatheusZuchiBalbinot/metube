import { useState, useCallback, useRef, useEffect } from 'react';

interface PlayerCallbacks {
    onTimeUpdate?: () => void
    onLoadedMetadata?: () => void
    onEnded?: () => void
}

interface PlayerPlaybackOptions {
    callbacks: PlayerCallbacks
    scheduleHideControls?: () => void
    forceShowControls?: () => void
    /** When provided, mute state is controlled by the parent (e.g. ShortsPage). */
    controlledMuted?: boolean
    /** When provided, volume is controlled by the parent. */
    controlledVolume?: number
    /** Notifies the parent when mute state changes internally (keyboard shortcut). */
    onMuteChange?: (muted: boolean) => void
}

export function usePlayerPlayback(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    options: PlayerPlaybackOptions,
) {
    const {
        callbacks,
        scheduleHideControls,
        forceShowControls,
        controlledMuted,
        controlledVolume,
        onMuteChange,
    } = options;

    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(controlledMuted ?? false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [bufferedPct, setBufferedPct] = useState(0);

    // Keep callbacks in ref so handlers don't need to be recreated on prop change
    const cbRef = useRef(callbacks);
    // eslint-disable-next-line react-hooks/refs
    cbRef.current = callbacks;

    const muteChangeRef = useRef(onMuteChange);
    // eslint-disable-next-line react-hooks/refs
    muteChangeRef.current = onMuteChange;

    // ─── Sync controlled muted from parent ────────────────────────────────────
    useEffect(() => {
        const hasValue = controlledMuted !== undefined;
        if (!hasValue) {
            return;
        }
        setIsMuted(controlledMuted);
        const el = videoRef.current;
        if (el) {
            el.muted = controlledMuted;
        }
    }, [controlledMuted, videoRef]);

    // ─── Sync controlled volume from parent ───────────────────────────────────
    useEffect(() => {
        const hasValue = controlledVolume !== undefined;
        if (!hasValue) {
            return;
        }
        const el = videoRef.current;
        if (el) {
            el.volume = controlledVolume;
        }
    }, [controlledVolume, videoRef]);

    // ─── Video event handlers ─────────────────────────────────────────────────

    const handleVideoPlay = useCallback(() => {
        setIsPlaying(true);
        setIsBuffering(false);
        scheduleHideControls?.();
    }, [scheduleHideControls]);

    const handleVideoPause = useCallback(() => {
        setIsPlaying(false);
        forceShowControls?.();
    }, [forceShowControls]);

    const handleVideoTimeUpdate = useCallback(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        setCurrentTime(el.currentTime);
        cbRef.current.onTimeUpdate?.();
    }, [videoRef]);

    const handleVideoLoadedMetadata = useCallback(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        setDuration(el.duration);
        cbRef.current.onLoadedMetadata?.();
    }, [videoRef]);

    const handleVideoEnded = useCallback(() => {
        setIsPlaying(false);
        forceShowControls?.();
        cbRef.current.onEnded?.();
    }, [forceShowControls]);

    const handleVideoProgress = useCallback(() => {
        const el = videoRef.current;
        const hasDuration = el && el.duration > 0 && el.buffered.length > 0;
        if (!hasDuration) {
            return;
        }
        const bufferedEnd = el.buffered.end(el.buffered.length - 1);
        setBufferedPct((bufferedEnd / el.duration) * 100);
    }, [videoRef]);

    // ─── Actions ──────────────────────────────────────────────────────────────

    const handleTogglePlay = useCallback(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        const isVideoPaused = el.paused;
        if (isVideoPaused) {
            el.play().catch(() => { });
        } else {
            el.pause();
        }
    }, [videoRef]);

    function applyVolume(newVol: number) {
        const el = videoRef.current;
        setVolume(newVol);
        const shouldMute = newVol === 0;
        setIsMuted(shouldMute);
        if (el) {
            el.volume = newVol;
            el.muted = shouldMute;
        }
    }

    function applyMuteToggle() {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        const newMuted = !isMuted;
        el.muted = newMuted;
        setIsMuted(newMuted);
        muteChangeRef.current?.(newMuted);
    }

    function applyPlaybackRate(rate: number) {
        const el = videoRef.current;
        setPlaybackRate(rate);
        if (el) {
            el.playbackRate = rate;
        }
    }

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return {
        isPlaying, isBuffering, currentTime, duration,
        volume, isMuted, playbackRate, bufferedPct, progressPct,
        setIsPlaying, setIsBuffering, setCurrentTime, setDuration, setBufferedPct,
        handleVideoPlay, handleVideoPause, handleVideoTimeUpdate,
        handleVideoLoadedMetadata, handleVideoEnded, handleVideoProgress,
        handleTogglePlay, applyVolume, applyMuteToggle, applyPlaybackRate,
    };
}

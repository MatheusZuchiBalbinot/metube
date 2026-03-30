import { useState, useCallback, useRef } from 'react';

interface PlayerCallbacks {
    onTimeUpdate?: () => void
    onLoadedMetadata?: () => void
    onEnded?: () => void
}

export function usePlayerPlayback(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    callbacks: PlayerCallbacks,
    scheduleHideControls: () => void,
    forceShowControls: () => void,
) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [bufferedPct, setBufferedPct] = useState(0);

    // Keep callbacks in ref so handlers don't need to be recreated on prop change
    const cbRef = useRef(callbacks);
    // eslint-disable-next-line react-hooks/refs
    cbRef.current = callbacks;

    const handleVideoPlay = useCallback(() => {
        setIsPlaying(true);
        setIsBuffering(false);
        scheduleHideControls();
    }, [scheduleHideControls]);

    const handleVideoPause = useCallback(() => {
        setIsPlaying(false);
        forceShowControls();
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
        forceShowControls();
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

    function applyVolume(newVol: number) {
        const el = videoRef.current;
        setVolume(newVol);
        const shouldMute = newVol === 0;
        setIsMuted(shouldMute);
        if (el) {
            el.volume = newVol; el.muted = shouldMute;
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
    }

    function applyPlaybackRate(rate: number) {
        const el = videoRef.current;
        setPlaybackRate(rate);
        if (el) {
            el.playbackRate = rate;
        }
    }

    return {
        isPlaying, isBuffering, currentTime, duration,
        volume, isMuted, playbackRate, bufferedPct,
        setIsPlaying, setIsBuffering, setCurrentTime, setDuration, setBufferedPct,
        handleVideoPlay, handleVideoPause, handleVideoTimeUpdate,
        handleVideoLoadedMetadata, handleVideoEnded, handleVideoProgress,
        applyVolume, applyMuteToggle, applyPlaybackRate,
    };
}

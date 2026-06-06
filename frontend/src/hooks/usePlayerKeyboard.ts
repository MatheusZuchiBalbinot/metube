import { useEffect, useRef } from 'react';
import { KEYBOARD_SKIP_SECONDS } from '@components/player/playerTypes';
import { isTypingInInput } from '@utils';
import { SkipDirection } from '@enums/skipDirection';

interface PlayerKeyboardOptions {
    videoRef: React.RefObject<HTMLVideoElement | null>
    isDefault: boolean
    captureKeyboard: boolean
    onTogglePlay: () => void
    onSkip: (dir: SkipDirection) => void
    onVolumeChange: (newVol: number) => void
    onMuteToggle: () => void
    onFullscreenToggle: () => void
    onTheaterToggle?: () => void
    onPipToggle?: () => void
    onCaptionsToggle?: () => void
}

export function usePlayerKeyboard({
    videoRef,
    isDefault,
    captureKeyboard,
    onTogglePlay,
    onSkip,
    onVolumeChange,
    onMuteToggle,
    onFullscreenToggle,
    onTheaterToggle,
    onPipToggle,
    onCaptionsToggle,
}: PlayerKeyboardOptions) {
    // Keep callbacks in a ref so the effect never needs to re-run when they change identity.
    const cbRef = useRef({
        onTogglePlay, onSkip, onVolumeChange, onMuteToggle, onFullscreenToggle,
        onTheaterToggle, onPipToggle, onCaptionsToggle,
    });
    // eslint-disable-next-line react-hooks/refs
    cbRef.current = {
        onTogglePlay, onSkip, onVolumeChange, onMuteToggle, onFullscreenToggle,
        onTheaterToggle, onPipToggle, onCaptionsToggle,
    };

    useEffect(() => {
        if (!captureKeyboard) {
            return;
        }

        function handleKeyPress(el: HTMLVideoElement, e: KeyboardEvent) {
            // Normalize single-char keys to lowercase so 'm'/'M', 'f'/'F' etc.
            // collapse to a single handler entry. Multi-char keys (Arrow*) are kept as-is.
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

            // Number keys 0–9 jump to that tenth of the video (0 = start, 5 = 50%).
            const isDigit = key.length === 1 && key >= '0' && key <= '9';
            if (isDigit && Number.isFinite(el.duration)) {
                e.preventDefault();
                el.currentTime = el.duration * (Number(key) / 10);
                return;
            }

            function togglePlay() {
                cbRef.current.onTogglePlay();
            }
            function skipForward() {
                el.currentTime = Math.min(el.currentTime + KEYBOARD_SKIP_SECONDS, el.duration);
                cbRef.current.onSkip(SkipDirection.FWD);
            }
            function skipBackward() {
                el.currentTime = Math.max(el.currentTime - KEYBOARD_SKIP_SECONDS, 0);
                cbRef.current.onSkip(SkipDirection.BWD);
            }
            function muteToggle() {
                cbRef.current.onMuteToggle();
            }

            const keyHandlers: Record<string, () => void> = {
                ' ': togglePlay,
                'ArrowRight': skipForward,
                'ArrowLeft': skipBackward,
                'm': muteToggle,
            };

            const handler = keyHandlers[key];
            if (handler) {
                e.preventDefault();
                handler();
                return;
            }

            if (!isDefault) {
                return;
            }

            function volumeUp() {
                cbRef.current.onVolumeChange(Math.min(el.volume + 0.1, 1));
            }
            function volumeDown() {
                cbRef.current.onVolumeChange(Math.max(el.volume - 0.1, 0));
            }
            function fullscreenToggle() {
                cbRef.current.onFullscreenToggle();
            }
            function theaterToggle() {
                cbRef.current.onTheaterToggle?.();
            }
            function pipToggle() {
                cbRef.current.onPipToggle?.();
            }
            function captionsToggle() {
                cbRef.current.onCaptionsToggle?.();
            }
            const defaultHandlers: Record<string, () => void> = {
                'ArrowUp': volumeUp,
                'ArrowDown': volumeDown,
                'f': fullscreenToggle,
                't': theaterToggle,
                'i': pipToggle,
                'c': captionsToggle,
            };

            const defaultHandler = defaultHandlers[key];
            if (defaultHandler) {
                e.preventDefault();
                defaultHandler();
            }
        }

        function onKeyDown(e: KeyboardEvent) {
            const el = videoRef.current;
            if (!el) {
                return;
            }

            if (isTypingInInput(e.target)) {
                return;
            }

            const target = e.target as HTMLElement;
            const isInteractive = ['BUTTON', 'A'].includes(target.tagName);
            if (isInteractive) {
                return;
            }

            handleKeyPress(el, e);
        }

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [captureKeyboard, isDefault, videoRef]);
}

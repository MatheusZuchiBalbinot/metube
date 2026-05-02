import { useEffect, useRef } from 'react';
import { KEYBOARD_SKIP_SECONDS } from '@components/player/playerTypes';
import { isTypingInInput } from '@utils/dom';

interface PlayerKeyboardOptions {
    videoRef: React.RefObject<HTMLVideoElement | null>
    isDefault: boolean
    captureKeyboard: boolean
    onTogglePlay: () => void
    onSkip: (dir: 'fwd' | 'bwd') => void
    onVolumeChange: (newVol: number) => void
    onMuteToggle: () => void
    onFullscreenToggle: () => void
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
}: PlayerKeyboardOptions) {
    // Keep callbacks in a ref so the effect never needs to re-run when they change identity.
    const cbRef = useRef({ onTogglePlay, onSkip, onVolumeChange, onMuteToggle, onFullscreenToggle });
    // eslint-disable-next-line react-hooks/refs
    cbRef.current = { onTogglePlay, onSkip, onVolumeChange, onMuteToggle, onFullscreenToggle };

    useEffect(() => {
        if (!captureKeyboard) {
            return;
        }

        function handleKeyPress(el: HTMLVideoElement, e: KeyboardEvent) {
            // Normalize single-char keys to lowercase so 'm'/'M', 'f'/'F', 't'/'T'
            // collapse to a single handler entry. Multi-char keys (Arrow*) are kept as-is.
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

            function togglePlay() {
                cbRef.current.onTogglePlay();
            }
            function skipForward() {
                el.currentTime = Math.min(el.currentTime + KEYBOARD_SKIP_SECONDS, el.duration);
                cbRef.current.onSkip('fwd');
            }
            function skipBackward() {
                el.currentTime = Math.max(el.currentTime - KEYBOARD_SKIP_SECONDS, 0);
                cbRef.current.onSkip('bwd');
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

            const defaultHandlers: Record<string, () => void> = {
                'ArrowUp': volumeUp,
                'ArrowDown': volumeDown,
                'f': fullscreenToggle,
                't': fullscreenToggle,
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

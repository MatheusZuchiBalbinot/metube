import { useEffect, useRef } from 'react';

const KEYBOARD_SKIP_SECONDS = 5;

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
    cbRef.current = { onTogglePlay, onSkip, onVolumeChange, onMuteToggle, onFullscreenToggle };

    useEffect(() => {
        if (!captureKeyboard) { return; }

        function onKeyDown(e: KeyboardEvent) {
            const el = videoRef.current;
            if (!el) { return; }

            const target = e.target as HTMLElement;
            const isTyping =
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                target.isContentEditable;
            if (isTyping) { return; }

            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                cbRef.current.onTogglePlay();
                return;
            }

            const isInteractive = ['BUTTON', 'A'].includes(target.tagName);
            if (isInteractive) { return; }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                el.currentTime = Math.min(el.currentTime + KEYBOARD_SKIP_SECONDS, el.duration);
                cbRef.current.onSkip('fwd');
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                el.currentTime = Math.max(el.currentTime - KEYBOARD_SKIP_SECONDS, 0);
                cbRef.current.onSkip('bwd');
                return;
            }

            if (isDefault) {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    cbRef.current.onVolumeChange(Math.min(el.volume + 0.1, 1));
                    return;
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    cbRef.current.onVolumeChange(Math.max(el.volume - 0.1, 0));
                    return;
                }
            }

            if (e.key === 'm' || e.key === 'M') {
                cbRef.current.onMuteToggle();
                return;
            }

            if (isDefault && (e.key === 'f' || e.key === 'F' || e.key === 't' || e.key === 'T')) {
                cbRef.current.onFullscreenToggle();
            }
        }

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [captureKeyboard, isDefault, videoRef]);
}

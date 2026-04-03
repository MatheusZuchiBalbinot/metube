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
    // eslint-disable-next-line react-hooks/refs
    cbRef.current = { onTogglePlay, onSkip, onVolumeChange, onMuteToggle, onFullscreenToggle };

    useEffect(() => {
        if (!captureKeyboard) {
            return;
        }

        function handleKeyPress(el: HTMLVideoElement, e: KeyboardEvent) {
            const keyHandlers: Record<string, () => void> = {
                ' ': () => {
                    cbRef.current.onTogglePlay();
                },
                'ArrowRight': () => {
                    el.currentTime = Math.min(el.currentTime + KEYBOARD_SKIP_SECONDS, el.duration);
                    cbRef.current.onSkip('fwd');
                },
                'ArrowLeft': () => {
                    el.currentTime = Math.max(el.currentTime - KEYBOARD_SKIP_SECONDS, 0);
                    cbRef.current.onSkip('bwd');
                },
                'm': () => {
                    cbRef.current.onMuteToggle();
                },
                'M': () => {
                    cbRef.current.onMuteToggle();
                },
            };

            const handler = keyHandlers[e.key];
            if (handler) {
                e.preventDefault();
                handler();
            } else if (isDefault) {
                const defaultHandlers: Record<string, () => void> = {
                    'ArrowUp': () => {
                        cbRef.current.onVolumeChange(Math.min(el.volume + 0.1, 1));
                    },
                    'ArrowDown': () => {
                        cbRef.current.onVolumeChange(Math.max(el.volume - 0.1, 0));
                    },
                    'f': () => {
                        cbRef.current.onFullscreenToggle();
                    },
                    'F': () => {
                        cbRef.current.onFullscreenToggle();
                    },
                    't': () => {
                        cbRef.current.onFullscreenToggle();
                    },
                    'T': () => {
                        cbRef.current.onFullscreenToggle();
                    },
                };

                const defaultHandler = defaultHandlers[e.key];
                if (defaultHandler) {
                    e.preventDefault();
                    defaultHandler();
                }
            }
        }

        function onKeyDown(e: KeyboardEvent) {
            const el = videoRef.current;
            if (!el) {
                return;
            }

            const target = e.target as HTMLElement;
            const isTyping =
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                target.isContentEditable;
            if (isTyping) {
                return;
            }

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

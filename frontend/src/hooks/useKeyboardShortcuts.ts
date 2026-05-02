/* eslint-disable complexity */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@utils/routes';
import { isTypingInInput } from '@utils/dom';

interface KeyboardShortcutsOptions {
    onOpenUpload: () => void
    onOpenShortcuts: () => void
    onFocusSearch: () => void
    videoPageId?: string
    onLike?: () => void
    onSave?: () => void
    onToggleTheater?: () => void
}

export function useKeyboardShortcuts({
    onOpenUpload,
    onOpenShortcuts,
    onFocusSearch,
    videoPageId,
    onLike,
    onSave,
    onToggleTheater,
}: KeyboardShortcutsOptions) {
    const navigate = useNavigate();
    const pendingKeyRef = useRef<string | null>(null);
    const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (isTypingInInput(e.target)) {
                return;
            }

            const key = e.key.toLowerCase();

            // Chord sequences: G + H, G + P, G + S
            if (pendingKeyRef.current === 'g') {
                if (pendingTimerRef.current) {
                    clearTimeout(pendingTimerRef.current);
                }
                pendingKeyRef.current = null;

                if (key === 'h') {
                    navigate(ROUTES.HISTORY); return;
                }

                if (key === 'p') {
                    navigate(ROUTES.PROFILE); return;
                }

                if (key === 's') {
                    navigate(ROUTES.SEARCH); return;
                }
            }

            if (key === 'g') {
                pendingKeyRef.current = 'g';
                pendingTimerRef.current = setTimeout(() => {
                    pendingKeyRef.current = null;
                }, 800);
                return;
            }

            // Single key shortcuts (no modifiers other than Shift for '?')
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return;
            }

            if (key === '/' || key === 'f') {
                e.preventDefault();
                onFocusSearch();
                return;
            }

            if (key === 'u') {
                onOpenUpload();
                return;
            }

            if (key === '?' || (e.shiftKey && key === '/')) {
                onOpenShortcuts();
                return;
            }

            // Video page shortcuts
            if (videoPageId) {
                if (key === 'l' && onLike) {
                    onLike();
                    return;
                }

                if (key === 's' && onSave) {
                    onSave();
                    return;
                }

                if (key === 't' && onToggleTheater) {
                    onToggleTheater();
                    return;
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (pendingTimerRef.current) {
                clearTimeout(pendingTimerRef.current);
            }
        };
    }, [navigate, onOpenUpload, onOpenShortcuts, onFocusSearch, videoPageId, onLike, onSave, onToggleTheater]);
}

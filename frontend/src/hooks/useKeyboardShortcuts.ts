import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES, isTypingInInput } from '@utils';

// How long a leading "g" stays armed waiting for its second chord key (g+h, g+p, g+s).
const CHORD_WINDOW_MS = 800;

const CHORD_ROUTES: Record<string, string> = {
    h: ROUTES.HISTORY,
    p: ROUTES.PROFILE,
    s: ROUTES.SEARCH,
};

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
        const globalActions: Record<string, () => void> = {
            u: onOpenUpload,
            '?': onOpenShortcuts,
        };

        const videoActions: Record<string, (() => void) | undefined> = {
            l: onLike,
            s: onSave,
            t: onToggleTheater,
        };

        // Consumes a pending "g" chord if one is armed. Always clears the pending
        // state once "g" was armed, but only reports the key as handled (returning
        // true) when it matches a known chord route — an unmatched second key still
        // falls through to be evaluated as a normal shortcut below.
        function consumePendingChord(key: string): boolean {
            if (pendingKeyRef.current !== 'g') {
                return false;
            }

            if (pendingTimerRef.current) {
                clearTimeout(pendingTimerRef.current);
            }
            pendingKeyRef.current = null;

            const route = CHORD_ROUTES[key];

            if (!route) {
                return false;
            }

            navigate(route);
            return true;
        }

        function armChord() {
            pendingKeyRef.current = 'g';
            pendingTimerRef.current = setTimeout(() => {
                pendingKeyRef.current = null;
            }, CHORD_WINDOW_MS);
        }

        function hasModifierKey(e: KeyboardEvent): boolean {
            return e.ctrlKey || e.altKey || e.metaKey;
        }

        // Runs the single-key shortcuts that apply on every page. Returns whether a
        // match was found so handleKeyDown knows not to also try the video-page ones.
        function tryGlobalAction(key: string): boolean {
            const globalAction = globalActions[key];

            if (!globalAction) {
                return false;
            }

            globalAction();
            return true;
        }

        // Video-page-only shortcuts (like/save/theater) — no-op when not on a video page.
        function tryVideoAction(key: string) {
            if (!videoPageId) {
                return;
            }

            videoActions[key]?.();
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (isTypingInInput(e.target)) {
                return;
            }

            const key = e.key.toLowerCase();

            if (consumePendingChord(key)) {
                return;
            }

            if (key === 'g') {
                armChord();
                return;
            }

            if (hasModifierKey(e)) {
                return;
            }

            if (key === '/') {
                e.preventDefault();
                onFocusSearch();
                return;
            }

            if (tryGlobalAction(key)) {
                return;
            }

            tryVideoAction(key);
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

import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const SCROLL_KEY_PREFIX = 'scroll:';
const SAVE_DEBOUNCE_MS = 100;

function getScrollKey(pathname: string): string {
    return `${SCROLL_KEY_PREFIX}${pathname}`;
}

export function useScrollRestoration(): void {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        function onScroll() {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                sessionStorage.setItem(getScrollKey(pathname), String(window.scrollY));
            }, SAVE_DEBOUNCE_MS);
        }

        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [pathname]);

    // On route change: restore saved position on POP (back/forward), scroll to
    // top on PUSH/REPLACE (new navigation).
    useEffect(() => {
        const isPop = navigationType === 'POP';

        if (isPop) {
            const saved = sessionStorage.getItem(getScrollKey(pathname));
            const y = saved !== null ? parseInt(saved, 10) : 0;
            requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [pathname, navigationType]);
}

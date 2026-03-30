import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './navProgress.css';

type BarState = 'idle' | 'loading' | 'done';

export default function NavProgress() {
    const { pathname } = useLocation();
    const [state, setState] = useState<BarState>('idle');
    const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstRender = useRef(true);

    useEffect(() => {
        const isInitialMount = isFirstRender.current;
        if (isInitialMount) {
            isFirstRender.current = false;
            return;
        }

        if (doneTimer.current) {
            clearTimeout(doneTimer.current);
        }

        if (idleTimer.current) {
            clearTimeout(idleTimer.current);
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState('loading');

        // Complete the bar shortly after the sync cross-fade finishes (≈150ms)
        doneTimer.current = setTimeout(() => {
            setState('done');
        }, 200);

        // Reset to idle after the bar has faded out
        idleTimer.current = setTimeout(() => {
            setState('idle');
        }, 550);

        return () => {
            if (doneTimer.current) {
                clearTimeout(doneTimer.current);
            }

            if (idleTimer.current) {
                clearTimeout(idleTimer.current);
            }
        };
    }, [pathname]);

    const isIdle = state === 'idle';
    if (isIdle) {
        return null;
    }

    const barClass = ['nav-progress', `nav-progress--${state}`].join(' ');

    return <div className={barClass} aria-hidden="true" />;
}

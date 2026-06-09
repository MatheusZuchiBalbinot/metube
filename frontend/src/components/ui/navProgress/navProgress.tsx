import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './navProgress.css';
import { BarState } from '@enums/barState';



export default function NavProgress() {
    const { pathname } = useLocation();
    const [state, setState] = useState<BarState>(BarState.IDLE);
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

        setState(BarState.LOADING);

        // Complete the bar shortly after the sync cross-fade finishes (≈150ms)
        doneTimer.current = setTimeout(() => {
            setState(BarState.DONE);
        }, 200);

        // Reset to idle after the bar has faded out
        idleTimer.current = setTimeout(() => {
            setState(BarState.IDLE);
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

    const isIdle = state === BarState.IDLE;
    if (isIdle) {
        return null;
    }

    const barClass = ['nav-progress', `nav-progress--${state}`].join(' ');

    return <div className={barClass} aria-hidden="true" />;
}

import { useState, useRef, useEffect, useCallback } from 'react';
import type { PopIcon } from '@components/player/playerTypes';

const POP_DURATION_MS = 500;

export function usePopIcon() {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const keyRef = useRef(0);
    const [popIcon, setPopIcon] = useState<PopIcon | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const showPopIcon = useCallback((type: 'play' | 'pause') => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        keyRef.current += 1;
        setPopIcon({ type, key: keyRef.current });
        timerRef.current = setTimeout(() => setPopIcon(null), POP_DURATION_MS);
    }, []);

    const resetPopIcon = useCallback(() => setPopIcon(null), []);

    return { popIcon, showPopIcon, resetPopIcon };
}

import { useState, useRef, useEffect, useCallback } from 'react';
import type { SkipDirection, SkipIndicator } from '@components/player/playerTypes';

const SKIP_DURATION_MS = 800;

export function useSkipIndicator() {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const keyRef = useRef(0);
    const [skipIndicator, setSkipIndicator] = useState<SkipIndicator | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const showSkipIndicator = useCallback((dir: SkipDirection) => {
        keyRef.current += 1;
        const key = keyRef.current;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setSkipIndicator(prev => ({
            dir,
            count: prev?.dir === dir ? prev.count + 1 : 1,
            key,
        }));
        timerRef.current = setTimeout(() => setSkipIndicator(null), SKIP_DURATION_MS);
    }, []);

    const resetSkipIndicator = useCallback(() => setSkipIndicator(null), []);

    return { skipIndicator, showSkipIndicator, resetSkipIndicator };
}

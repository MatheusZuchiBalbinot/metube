import { useRef, useEffect, useCallback } from 'react';

const DEFAULT_DELAY_MS = 200;

export function useClickDoubleClick(
    onSingleClick: () => void,
    onDoubleClick: () => void,
    delayMs = DEFAULT_DELAY_MS,
) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cbRef = useRef({ onSingleClick, onDoubleClick });
    // eslint-disable-next-line react-hooks/refs
    cbRef.current = { onSingleClick, onDoubleClick };

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const handleClick = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            cbRef.current.onSingleClick();
        }, delayMs);
    }, [delayMs]);

    const handleDoubleClick = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        cbRef.current.onDoubleClick();
    }, []);

    return { handleClick, handleDoubleClick };
}

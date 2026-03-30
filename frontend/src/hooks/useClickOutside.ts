import { useEffect, useLayoutEffect, useRef } from 'react';

export function useClickOutside(
    ref: React.RefObject<HTMLElement | null>,
    callback: () => void,
    enabled: boolean = true,
): void {
    const callbackRef = useRef(callback);
    useLayoutEffect(() => {
        callbackRef.current = callback;
    });

    useEffect(() => {
        if (!enabled) {
            return;
        }

        function handleMouseDown(event: MouseEvent) {
            const isOutsideClick = ref.current !== null && !ref.current.contains(event.target as Node);
            if (isOutsideClick) {
                callbackRef.current();
            }
        }

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [ref, enabled]);
}

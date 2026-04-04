import { useEffect, useRef } from 'react';

export function useOutsideClick(
    ref: React.RefObject<HTMLElement | null>,
    onOutsideClick: () => void,
) {
    const cbRef = useRef(onOutsideClick);
    // eslint-disable-next-line react-hooks/refs
    cbRef.current = onOutsideClick;

    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            const isOutside = ref.current && !ref.current.contains(e.target as Node);
            if (isOutside) {
                cbRef.current();
            }
        }
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [ref]);
}

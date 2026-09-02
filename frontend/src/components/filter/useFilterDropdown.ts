import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';

export interface DropdownPos {
    top?: number
    bottom?: number
    left: number
    maxHeight: number
}

const DROPDOWN_WIDTH = 340;
const VIEWPORT_MARGIN = 12;
const TRIGGER_GAP = 8;
// Below this much free space under the trigger we flip the panel above it.
const FLIP_THRESHOLD = 360;

export interface UseFilterDropdownReturn {
    open: boolean
    dropdownPos: DropdownPos | null
    wrapRef: React.RefObject<HTMLDivElement | null>
    triggerRef: React.RefObject<HTMLButtonElement | null>
    dropdownRef: React.RefObject<HTMLDivElement | null>
    toggle: () => void
    close: () => void
}

export function useFilterDropdown(): UseFilterDropdownReturn {
    const [open, setOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const triggerEl = triggerRef.current;

        if (!triggerEl) {
            return;
        }

        const rect = triggerEl.getBoundingClientRect();

        let left = rect.left;

        if (left + DROPDOWN_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
            left = window.innerWidth - DROPDOWN_WIDTH - VIEWPORT_MARGIN;
        }

        left = Math.max(VIEWPORT_MARGIN, left);

        const spaceBelow = window.innerHeight - rect.bottom - TRIGGER_GAP - VIEWPORT_MARGIN;
        const spaceAbove = rect.top - TRIGGER_GAP - VIEWPORT_MARGIN;
        const shouldFlipUp = spaceBelow < FLIP_THRESHOLD && spaceAbove > spaceBelow;

        if (shouldFlipUp) {
            setDropdownPos({ bottom: window.innerHeight - rect.top + TRIGGER_GAP, left, maxHeight: Math.max(160, spaceAbove) });
            return;
        }

        setDropdownPos({ top: rect.bottom + TRIGGER_GAP, left, maxHeight: Math.max(160, spaceBelow) });
    }, []);

    useLayoutEffect(() => {
        if (!open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDropdownPos(null);
            return;
        }

        updatePosition();
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handleOutside(e: MouseEvent) {
            const target = e.target as Element;
            const isInsideWrap = wrapRef.current?.contains(target);
            const isInsideDropdown = dropdownRef.current?.contains(target);
            const isInsidePortal = !!target.closest?.('[data-radix-popper-content-wrapper]');

            if (!isInsideWrap && !isInsideDropdown && !isInsidePortal) {
                setOpen(false);
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            const isPressedEsc = e.key === 'Escape';

            if (!isPressedEsc) {
                return;
            }

            setOpen(false);
            triggerRef.current?.focus();
        }

        function handleScrollOrResize(e?: Event) {
            const target = (e as UIEvent | undefined)?.target as Element | null;
            const isInsideDropdown = target !== null && dropdownRef.current?.contains(target);

            if (isInsideDropdown) {
                return;
            }

            // Keep the panel anchored to the trigger instead of closing it.
            updatePosition();
        }

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleScrollOrResize);
        // capture: true so it fires for any scrollable ancestor
        window.addEventListener('scroll', handleScrollOrResize, true);

        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [open, updatePosition]);

    function toggle() {
        setOpen(v => !v);
    }

    function close() {
        setOpen(false);
    }

    return { open, dropdownPos, wrapRef, triggerRef, dropdownRef, toggle, close };
}

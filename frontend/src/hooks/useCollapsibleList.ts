import { useState } from 'react';

export interface UseCollapsibleListReturn<T> {
    visible: T[]
    isOverflowing: boolean
    expanded: boolean
    toggle: () => void
}

/**
 * Caps a list to `limit` entries with an expand/collapse toggle.
 *
 * Shared by sidebar sections (subscriptions, playlists) that show the first N
 * items behind a "show more" control.
 *
 * @param items - The full list.
 * @param limit - Maximum entries shown while collapsed.
 * @returns The visible slice, whether the list overflows, the expanded flag and a toggle.
 */
export function useCollapsibleList<T>(items: T[], limit: number): UseCollapsibleListReturn<T> {
    const [expanded, setExpanded] = useState(false);

    const isOverflowing = items.length > limit;
    const visible = expanded ? items : items.slice(0, limit);

    function toggle() {
        setExpanded(prev => !prev);
    }

    return { visible, isOverflowing, expanded, toggle };
}

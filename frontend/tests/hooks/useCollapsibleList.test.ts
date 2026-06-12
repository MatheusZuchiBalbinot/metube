// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollapsibleList } from '@hooks/useCollapsibleList';

const items = ['a', 'b', 'c', 'd', 'e'];

describe('useCollapsibleList', () => {
    it('caps the visible slice to the limit while collapsed', () => {
        const { result } = renderHook(() => useCollapsibleList(items, 3));

        expect(result.current.visible).toEqual(['a', 'b', 'c']);
        expect(result.current.isOverflowing).toBe(true);
        expect(result.current.expanded).toBe(false);
    });

    it('reveals every item once expanded', () => {
        const { result } = renderHook(() => useCollapsibleList(items, 3));

        act(() => {
            result.current.toggle();
        });

        expect(result.current.expanded).toBe(true);
        expect(result.current.visible).toEqual(items);
    });

    it('does not overflow when the list fits within the limit', () => {
        const { result } = renderHook(() => useCollapsibleList(['a', 'b'], 3));

        expect(result.current.isOverflowing).toBe(false);
        expect(result.current.visible).toEqual(['a', 'b']);
    });
});

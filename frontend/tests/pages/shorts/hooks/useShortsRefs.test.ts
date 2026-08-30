// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShortsRefs } from '@pages/shorts/hooks/useShortsRefs';

describe('useShortsRefs', () => {
    it('grows videoRefs to match count', () => {
        const { result } = renderHook(() => useShortsRefs(3));

        expect(result.current.videoRefs.current).toHaveLength(3);
        expect(result.current.videoRefs.current.every(r => r.current === null)).toBe(true);
    });

    it('grows videoRefs further when count increases', () => {
        const { result, rerender } = renderHook(({ count }: { count: number }) => useShortsRefs(count), {
            initialProps: { count: 2 },
        });
        expect(result.current.videoRefs.current).toHaveLength(2);

        rerender({ count: 5 });

        expect(result.current.videoRefs.current).toHaveLength(5);
    });

    it('mountVideo registers an element in videoMap', () => {
        const { result } = renderHook(() => useShortsRefs(1));
        const el = document.createElement('video');

        result.current.mountVideo(0, el);

        expect(result.current.videoMap.current.get(0)).toBe(el);
    });

    it('mountVideo with null removes the entry from videoMap', () => {
        const { result } = renderHook(() => useShortsRefs(1));
        const el = document.createElement('video');

        result.current.mountVideo(0, el);
        result.current.mountVideo(0, null);

        expect(result.current.videoMap.current.has(0)).toBe(false);
    });
});

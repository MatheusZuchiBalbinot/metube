// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, render } from '@testing-library/react';
import React from 'react';
import { useShortsRefs } from '@pages/shorts/hooks/useShortsRefs';

describe('useShortsRefs', () => {
    it('getVideoRef returns a ref object with current initially null', () => {
        const { result } = renderHook(() => useShortsRefs());

        const ref = result.current.getVideoRef(0);
        expect(ref.current).toBeNull();
    });

    it('getVideoRef returns the same ref object for the same index on later calls', () => {
        const { result } = renderHook(() => useShortsRefs());

        const first = result.current.getVideoRef(2);
        first.current = document.createElement('video');

        const second = result.current.getVideoRef(2);
        expect(second).toBe(first);
        expect(second.current).toBe(first.current);
    });

    it('getVideoRef returns independent refs for different indices', () => {
        const { result } = renderHook(() => useShortsRefs());

        expect(result.current.getVideoRef(0)).not.toBe(result.current.getVideoRef(1));
    });

    it('has a ref available synchronously during render for any index, including one requested for the first time (before any effect flushes)', () => {
        // Regression test: videoRefs used to grow inside a useLayoutEffect, so a
        // consumer reading videoRefs.current[index] in the SAME render pass (as
        // ShortsPage does when passing a ref down to ShortsItem/ShortPlayer)
        // could see `undefined` for indices beyond the previous render's count —
        // crashing usePlayerPlayback with "Cannot read properties of undefined
        // (reading 'current')". getVideoRef must work synchronously, during
        // render, the very first time a new index is requested.
        let readDuringRender: (React.RefObject<HTMLVideoElement | null> | undefined)[] = [];

        function Probe({ count }: { count: number }) {
            const { getVideoRef } = useShortsRefs();
            readDuringRender = Array.from({ length: count }, (_, i) => getVideoRef(i));
            return null;
        }

        const { rerender } = render(React.createElement(Probe, { count: 2 }));
        expect(readDuringRender).toHaveLength(2);
        expect(readDuringRender.every(r => r !== undefined)).toBe(true);

        rerender(React.createElement(Probe, { count: 5 }));
        expect(readDuringRender).toHaveLength(5);
        expect(readDuringRender.every(r => r !== undefined)).toBe(true);
    });

    it('mountVideo registers an element in videoMap', () => {
        const { result } = renderHook(() => useShortsRefs());
        const el = document.createElement('video');

        result.current.mountVideo(0, el);

        expect(result.current.videoMap.current.get(0)).toBe(el);
    });

    it('mountVideo with null removes the entry from videoMap', () => {
        const { result } = renderHook(() => useShortsRefs());
        const el = document.createElement('video');

        result.current.mountVideo(0, el);
        result.current.mountVideo(0, null);

        expect(result.current.videoMap.current.has(0)).toBe(false);
    });
});

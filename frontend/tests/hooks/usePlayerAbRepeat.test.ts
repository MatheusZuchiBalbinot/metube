// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerAbRepeat } from '@hooks/usePlayerAbRepeat';

function makeVideoRef(initialTime = 0) {
    let time = initialTime;
    const el = document.createElement('video');
    Object.defineProperty(el, 'currentTime', {
        get: () => time,
        set: (v: number) => {
            time = v;
        },
        configurable: true,
    });
    function setTime(v: number) {
        time = v;
    }

    return { ref: { current: el }, el, setTime };
}

describe('usePlayerAbRepeat', () => {
    it('marks point A on first press', () => {
        const { ref } = makeVideoRef(12);
        const { result } = renderHook(() => usePlayerAbRepeat(ref, 'src-1'));

        act(() => {
            result.current.handleAbRepeat();
        });

        expect(result.current.abRepeat).toEqual({ a: 12, b: null });
        expect(result.current.abStatus).toBe(1);
    });

    it('marks point B on second press and arms the loop', () => {
        const { ref, setTime } = makeVideoRef(5);
        const { result } = renderHook(() => usePlayerAbRepeat(ref, 'src-1'));

        act(() => {
            result.current.handleAbRepeat();
        });
        act(() => {
            setTime(20);
            result.current.handleAbRepeat();
        });

        expect(result.current.abRepeat).toEqual({ a: 5, b: 20 });
        expect(result.current.abStatus).toBe(2);
    });

    it('orders A and B when B is set before A', () => {
        const { ref, setTime } = makeVideoRef(30);
        const { result } = renderHook(() => usePlayerAbRepeat(ref, 'src-1'));

        act(() => {
            result.current.handleAbRepeat();
        });
        act(() => {
            setTime(10);
            result.current.handleAbRepeat();
        });

        expect(result.current.abRepeat).toEqual({ a: 10, b: 30 });
    });

    it('clears on the third press', () => {
        const { ref, setTime } = makeVideoRef(5);
        const { result } = renderHook(() => usePlayerAbRepeat(ref, 'src-1'));

        act(() => {
            result.current.handleAbRepeat();
        });
        act(() => {
            setTime(15);
            result.current.handleAbRepeat();
        });
        act(() => {
            result.current.handleAbRepeat();
        });

        expect(result.current.abRepeat).toEqual({ a: null, b: null });
        expect(result.current.abStatus).toBe(0);
    });

    it('jumps back to A when playback passes B', () => {
        const { ref, el, setTime } = makeVideoRef(5);
        const { result } = renderHook(() => usePlayerAbRepeat(ref, 'src-1'));

        act(() => {
            result.current.handleAbRepeat();
        });
        act(() => {
            setTime(20);
            result.current.handleAbRepeat();
        });

        act(() => {
            setTime(21);
            el.dispatchEvent(new Event('timeupdate'));
        });

        expect(el.currentTime).toBe(5);
    });

    it('resets when the source changes', () => {
        const { ref } = makeVideoRef(8);
        const { result, rerender } = renderHook(
            ({ src }) => usePlayerAbRepeat(ref, src),
            { initialProps: { src: 'src-1' } },
        );

        act(() => {
            result.current.handleAbRepeat();
        });
        expect(result.current.abStatus).toBe(1);

        rerender({ src: 'src-2' });

        expect(result.current.abRepeat).toEqual({ a: null, b: null });
        expect(result.current.abStatus).toBe(0);
    });
});

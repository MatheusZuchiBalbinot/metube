// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePopIcon } from '@hooks/usePopIcon';
import { PopIconType } from '@enums/popIconType';

describe('usePopIcon — initial state', () => {
    it('starts with popIcon = null', () => {
        const { result } = renderHook(() => usePopIcon());
        expect(result.current.popIcon).toBeNull();
    });
});

describe('usePopIcon — showPopIcon', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sets popIcon with the correct type when showPopIcon is called', () => {
        const { result } = renderHook(() => usePopIcon());

        act(() => {
            result.current.showPopIcon(PopIconType.PLAY);
        });

        expect(result.current.popIcon).not.toBeNull();
        expect(result.current.popIcon?.type).toBe(PopIconType.PLAY);
    });

    it('sets popIcon with type PAUSE', () => {
        const { result } = renderHook(() => usePopIcon());

        act(() => {
            result.current.showPopIcon(PopIconType.PAUSE);
        });

        expect(result.current.popIcon?.type).toBe(PopIconType.PAUSE);
    });

    it('increments the key on each showPopIcon call', () => {
        const { result } = renderHook(() => usePopIcon());

        act(() => {
            result.current.showPopIcon(PopIconType.PLAY);
        });

        const firstKey = result.current.popIcon?.key;

        act(() => {
            result.current.showPopIcon(PopIconType.PLAY);
        });

        const secondKey = result.current.popIcon?.key;
        expect(secondKey).toBeGreaterThan(firstKey!);
    });

    it('resets popIcon to null after 500ms', () => {
        const { result } = renderHook(() => usePopIcon());

        act(() => {
            result.current.showPopIcon(PopIconType.PLAY);
        });

        expect(result.current.popIcon).not.toBeNull();

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current.popIcon).toBeNull();
    });

    it('resets timer when showPopIcon is called again before timeout', () => {
        const { result } = renderHook(() => usePopIcon());

        act(() => {
            result.current.showPopIcon(PopIconType.PLAY);
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        act(() => {
            result.current.showPopIcon(PopIconType.PAUSE);
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current.popIcon).not.toBeNull();

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current.popIcon).toBeNull();
    });
});

describe('usePopIcon — resetPopIcon', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sets popIcon to null immediately', () => {
        const { result } = renderHook(() => usePopIcon());

        act(() => {
            result.current.showPopIcon(PopIconType.PLAY);
        });

        act(() => {
            result.current.resetPopIcon();
        });

        expect(result.current.popIcon).toBeNull();
    });
});

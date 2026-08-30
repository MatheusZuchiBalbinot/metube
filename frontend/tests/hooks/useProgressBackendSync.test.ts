// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProgressBackendSync } from '@hooks/useProgressBackendSync';
import { vid } from '../helpers/factories';
import type { VideoId } from '@models';

describe('useProgressBackendSync', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('calls onBackendSync with the rounded percent every 5 seconds while there is real progress', () => {
        const onBackendSync = vi.fn();
        const id = vid('v-sync');

        renderHook(() => useProgressBackendSync({
            id,
            readProgress: () => ({ seconds: 30, percent: 49.6 }),
            onBackendSync,
        }));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(onBackendSync).toHaveBeenCalledTimes(1);
        expect(onBackendSync).toHaveBeenCalledWith(id, 50);
    });

    it('does not call onBackendSync when there is no progress yet', () => {
        const onBackendSync = vi.fn();
        const id = vid('v-empty');

        renderHook(() => useProgressBackendSync({
            id,
            readProgress: () => ({ seconds: 0, percent: 0 }),
            onBackendSync,
        }));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(onBackendSync).not.toHaveBeenCalled();
    });

    it('does nothing when id is undefined', () => {
        const onBackendSync = vi.fn();

        renderHook(() => useProgressBackendSync({
            id: undefined,
            readProgress: () => ({ seconds: 30, percent: 50 }),
            onBackendSync,
        }));

        act(() => {
            vi.advanceTimersByTime(10_000);
        });

        expect(onBackendSync).not.toHaveBeenCalled();
    });

    it('stops ticking after unmount', () => {
        const onBackendSync = vi.fn();
        const id = vid('v-unmount');

        const { unmount } = renderHook(() => useProgressBackendSync({
            id,
            readProgress: () => ({ seconds: 30, percent: 50 }),
            onBackendSync,
        }));

        unmount();

        act(() => {
            vi.advanceTimersByTime(10_000);
        });

        expect(onBackendSync).not.toHaveBeenCalled();
    });

    it('reads the latest readProgress and onBackendSync from re-renders without resetting the interval', () => {
        const first = vi.fn();
        const second = vi.fn();
        const id = vid('v-latest');

        const { rerender } = renderHook(
            (props: { onBackendSync: (id: VideoId, pct: number) => void }) => useProgressBackendSync({
                id,
                readProgress: () => ({ seconds: 30, percent: 50 }),
                onBackendSync: props.onBackendSync,
            }),
            { initialProps: { onBackendSync: first } },
        );

        rerender({ onBackendSync: second });

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith(id, 50);
    });
});

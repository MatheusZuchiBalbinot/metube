// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSkipAnalytics } from '@pages/video/hooks/useSkipAnalytics';

const skipSpy = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        analytics: { skip: skipSpy },
        toVuid: (id: string) => id,
    };
});

describe('useSkipAnalytics', () => {
    beforeEach(() => {
        skipSpy.mockClear();
    });

    it('does nothing on unmount when the watch percent never advanced', () => {
        const { unmount } = renderHook(() => useSkipAnalytics('v1', 0));

        unmount();

        expect(skipSpy).not.toHaveBeenCalled();
    });

    it('reports a skip when unmounted after an early abandon (percent between 0 and 10)', () => {
        const { rerender, unmount } = renderHook(
            ({ percent }: { percent: number }) => useSkipAnalytics('v1', percent),
            { initialProps: { percent: 0 } },
        );

        rerender({ percent: 5 });
        unmount();

        expect(skipSpy).toHaveBeenCalledWith({ vuid: 'v1', percent: 5 });
    });

    it('does not report a skip once the viewer watched past 10%', () => {
        const { rerender, unmount } = renderHook(
            ({ percent }: { percent: number }) => useSkipAnalytics('v1', percent),
            { initialProps: { percent: 0 } },
        );

        rerender({ percent: 45 });
        unmount();

        expect(skipSpy).not.toHaveBeenCalled();
    });

    it('does nothing when id is undefined', () => {
        const { rerender, unmount } = renderHook(
            ({ percent }: { percent: number }) => useSkipAnalytics(undefined, percent),
            { initialProps: { percent: 0 } },
        );

        rerender({ percent: 5 });
        unmount();

        expect(skipSpy).not.toHaveBeenCalled();
    });

    it('resets tracking when the video id changes', () => {
        const { rerender, unmount } = renderHook(
            ({ id, percent }: { id: string; percent: number }) => useSkipAnalytics(id, percent),
            { initialProps: { id: 'v1', percent: 5 } },
        );

        // Switching id flushes the previous tracker (early abandon on v1).
        rerender({ id: 'v2', percent: 0 });
        expect(skipSpy).toHaveBeenCalledWith({ vuid: 'v1', percent: 5 });

        skipSpy.mockClear();
        unmount();
        expect(skipSpy).not.toHaveBeenCalled();
    });
});

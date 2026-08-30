// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVideoClickTracking } from '@hooks/useVideoClickTracking';
import { AnalyticsSource } from '@api';
import { vid } from '../helpers/factories';

const clickSpy = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        analytics: { click: clickSpy },
    };
});
vi.mock('@utils', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        getSessionId: () => 'session-123',
    };
});

describe('useVideoClickTracking', () => {
    beforeEach(() => {
        clickSpy.mockClear();
    });

    it('reports a click with the vuid, source and session id', () => {
        const { result } = renderHook(() => useVideoClickTracking(vid('v-1'), AnalyticsSource.GRID));

        result.current(3);

        expect(clickSpy).toHaveBeenCalledWith({
            vuid: 'v-1',
            source: AnalyticsSource.GRID,
            position: 3,
            sessionId: 'session-123',
        });
    });

    it('omits position when not given', () => {
        const { result } = renderHook(() => useVideoClickTracking(vid('v-2'), AnalyticsSource.SEARCH));

        result.current();

        expect(clickSpy).toHaveBeenCalledWith(expect.objectContaining({ vuid: 'v-2', position: undefined }));
    });

    it('does not report when the video id resolves to an empty vuid', () => {
        const { result } = renderHook(() => useVideoClickTracking(vid(''), AnalyticsSource.HOME));

        result.current();

        expect(clickSpy).not.toHaveBeenCalled();
    });

    it('swallows analytics failures', async () => {
        clickSpy.mockRejectedValueOnce(new Error('network error'));
        const { result } = renderHook(() => useVideoClickTracking(vid('v-3'), AnalyticsSource.CHANNEL));

        expect(() => result.current()).not.toThrow();
    });

    it('memoizes the callback across renders with the same videoId/source', () => {
        const { result, rerender } = renderHook(
            ({ id }: { id: ReturnType<typeof vid> }) => useVideoClickTracking(id, AnalyticsSource.HOME),
            { initialProps: { id: vid('v-4') } },
        );
        const first = result.current;
        rerender({ id: vid('v-4') });

        expect(result.current).toBe(first);
    });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeedSections } from '@pages/home/hooks/useFeedSections';
import { makeVideo, vid } from '../../../helpers/factories';

const listSpy = vi.hoisted(() => vi.fn());
vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        feed: { list: listSpy },
    };
});

describe('useFeedSections', () => {
    beforeEach(() => {
        listSpy.mockReset();
    });

    it('starts in a loading state with no sections', () => {
        listSpy.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useFeedSections());

        expect(result.current.isLoading).toBe(true);
        expect(result.current.sections).toEqual([]);
    });

    it('loads sections from the feed API', async () => {
        const section = { key: 'trending', label: 'Trending', videos: [makeVideo({ id: vid('v1') })] };
        listSpy.mockResolvedValue({ ok: true, data: [section] });

        const { result } = renderHook(() => useFeedSections());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.sections).toEqual([section]);
    });

    it('falls back to an empty list when the request fails', async () => {
        listSpy.mockResolvedValue({ ok: false, error: 'network error' });

        const { result } = renderHook(() => useFeedSections());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.sections).toEqual([]);
    });

    it('ignores a late response after unmount', async () => {
        let resolveList: (v: unknown) => void = () => {};
        listSpy.mockReturnValue(new Promise(resolve => {
            resolveList = resolve;
        }));

        const { result, unmount } = renderHook(() => useFeedSections());
        unmount();

        resolveList({ ok: true, data: [{ key: 'x', label: null, videos: [] }] });
        await new Promise(r => setTimeout(r, 0));

        // Still the initial state — the late response was ignored, not applied post-unmount.
        expect(result.current.sections).toEqual([]);
        expect(result.current.isLoading).toBe(true);
    });
});

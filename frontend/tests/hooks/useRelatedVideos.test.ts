// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRelatedVideos } from '@hooks/useRelatedVideos';
import { makeVideo, vid, tag } from '../helpers/factories';

vi.mock('@api', () => ({
    video: {
        list: vi.fn(),
    },
    toVuid: (id: string) => id,
}));

import { video as videoApi } from '@api';

describe('useRelatedVideos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty array and loadingRelated=false when videoId is undefined', () => {
        const { result } = renderHook(() => useRelatedVideos(undefined, [tag('test')]));

        expect(result.current.relatedVideos).toEqual([]);
        expect(result.current.loadingRelated).toBe(false);
        expect(videoApi.list).not.toHaveBeenCalled();
    });

    it('fetches videos and filters out the current videoId', async () => {
        const currentId = vid('v-current');
        const other = makeVideo({ id: vid('v-other') });
        const current = makeVideo({ id: currentId });
        vi.mocked(videoApi.list).mockResolvedValue({
            ok: true,
            data: { data: [current, other], meta: { page: 1, lastPage: 1, total: 2 } },
        } as Awaited<ReturnType<typeof videoApi.list>>);

        const { result } = renderHook(() => useRelatedVideos(currentId, [tag('react')]));

        await waitFor(() => {
            expect(result.current.relatedVideos).toHaveLength(1);
        });

        expect(result.current.relatedVideos[0].id).toBe(vid('v-other'));
        expect(result.current.loadingRelated).toBe(false);
    });

    it('limits results to 10 videos', async () => {
        const lots = Array.from({ length: 15 }, (_, i) => makeVideo({ id: vid(`v-${i}`) }));
        vi.mocked(videoApi.list).mockResolvedValue({
            ok: true,
            data: { data: lots, meta: { page: 1, lastPage: 1, total: 15 } },
        } as Awaited<ReturnType<typeof videoApi.list>>);

        const { result } = renderHook(() => useRelatedVideos(vid('v-active'), [tag('test')]));

        await waitFor(() => {
            expect(result.current.relatedVideos.length).toBeGreaterThan(0);
        });

        expect(result.current.relatedVideos.length).toBeLessThanOrEqual(10);
    });

    it('does not update state when API fails', async () => {
        vi.mocked(videoApi.list).mockResolvedValue({
            ok: false,
            error: 'Network',
        } as Awaited<ReturnType<typeof videoApi.list>>);

        const { result } = renderHook(() => useRelatedVideos(vid('v-fail'), []));

        await waitFor(() => {
            expect(result.current.loadingRelated).toBe(false);
        });

        expect(result.current.relatedVideos).toEqual([]);
    });

    it('sets loadingRelated=true while fetching', async () => {
        let resolveList!: (v: Awaited<ReturnType<typeof videoApi.list>>) => void;
        vi.mocked(videoApi.list).mockReturnValue(
            new Promise(res => {
                resolveList = res;
            }),
        );

        const { result } = renderHook(() => useRelatedVideos(vid('v-load'), []));

        await waitFor(() => {
            expect(result.current.loadingRelated).toBe(true);
        });

        resolveList({
            ok: true,
            data: { data: [], meta: { page: 1, lastPage: 1, total: 0 } },
        } as Awaited<ReturnType<typeof videoApi.list>>);

        await waitFor(() => {
            expect(result.current.loadingRelated).toBe(false);
        });
    });
});

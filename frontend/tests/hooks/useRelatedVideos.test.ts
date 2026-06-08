// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRelatedVideos } from '@hooks/useRelatedVideos';
import { makeVideo, vid } from '../helpers/factories';

vi.mock('@api', () => ({
    video: {
        related: vi.fn(),
    },
    toVuid: (id: string) => id,
}));

import { video as videoApi } from '@api';

describe('useRelatedVideos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty array and loadingRelated=false when videoId is undefined', () => {
        const { result } = renderHook(() => useRelatedVideos(undefined));

        expect(result.current.relatedVideos).toEqual([]);
        expect(result.current.loadingRelated).toBe(false);
        expect(videoApi.related).not.toHaveBeenCalled();
    });

    it('fetches related videos from the backend for the current video', async () => {
        const a = makeVideo({ id: vid('v-a') });
        const b = makeVideo({ id: vid('v-b') });
        vi.mocked(videoApi.related).mockResolvedValue([a, b]);

        const { result } = renderHook(() => useRelatedVideos(vid('v-current')));

        await waitFor(() => {
            expect(result.current.relatedVideos).toHaveLength(2);
        });

        expect(videoApi.related).toHaveBeenCalledWith('v-current');
        expect(result.current.relatedVideos.map(v => v.id)).toEqual([vid('v-a'), vid('v-b')]);
        expect(result.current.loadingRelated).toBe(false);
    });

    it('keeps an empty list when the backend returns nothing', async () => {
        vi.mocked(videoApi.related).mockResolvedValue([]);

        const { result } = renderHook(() => useRelatedVideos(vid('v-empty')));

        await waitFor(() => {
            expect(result.current.loadingRelated).toBe(false);
        });

        expect(result.current.relatedVideos).toEqual([]);
    });

    it('sets loadingRelated=true while fetching', async () => {
        let resolve!: (v: ReturnType<typeof makeVideo>[]) => void;
        vi.mocked(videoApi.related).mockReturnValue(new Promise(res => {
            resolve = res;
        }));

        const { result } = renderHook(() => useRelatedVideos(vid('v-load')));

        await waitFor(() => {
            expect(result.current.loadingRelated).toBe(true);
        });

        resolve([]);

        await waitFor(() => {
            expect(result.current.loadingRelated).toBe(false);
        });
    });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSpotlightComments } from '@pages/profile/hooks/useSpotlightComments';
import { vid, makeComment } from '../../../helpers/factories';

const listSpy = vi.hoisted(() => vi.fn());
vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        comments: { list: listSpy },
        toVuid: (id: string) => id,
    };
});

describe('useSpotlightComments', () => {
    beforeEach(() => {
        listSpy.mockReset();
    });

    it('returns an empty array when featuredId is null', () => {
        const { result } = renderHook(() => useSpotlightComments(null));

        expect(result.current).toEqual([]);
        expect(listSpy).not.toHaveBeenCalled();
    });

    it('fetches comments for the featured video and keeps only the first two', async () => {
        const commentList = [makeComment({ id: vid('c1') as unknown as never }), makeComment(), makeComment()];
        listSpy.mockResolvedValue({ ok: true, data: { data: commentList } });

        const { result } = renderHook(() => useSpotlightComments(vid('v1')));

        await waitFor(() => expect(result.current).toHaveLength(2));
        expect(listSpy).toHaveBeenCalledWith('v1', { page: 1 });
    });

    it('keeps spotlightComments empty when the request fails', async () => {
        listSpy.mockResolvedValue({ ok: false, error: 'nope' });

        const { result } = renderHook(() => useSpotlightComments(vid('v1')));

        await waitFor(() => expect(listSpy).toHaveBeenCalled());
        expect(result.current).toEqual([]);
    });

    it('resets to an empty array when featuredId changes', async () => {
        listSpy.mockResolvedValue({ ok: true, data: { data: [makeComment()] } });

        const { result, rerender } = renderHook(
            ({ id }: { id: ReturnType<typeof vid> | null }) => useSpotlightComments(id),
            { initialProps: { id: vid('v1') } },
        );

        await waitFor(() => expect(result.current).toHaveLength(1));

        rerender({ id: vid('v2') });

        await waitFor(() => expect(listSpy).toHaveBeenCalledTimes(2));
    });
});

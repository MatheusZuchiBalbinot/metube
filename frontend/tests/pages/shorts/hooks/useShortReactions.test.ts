// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShortReactions } from '@pages/shorts/hooks/useShortReactions';
import { vid } from '../../../helpers/factories';

const useReactionsSpy = vi.hoisted(() => vi.fn());
vi.mock('@hooks', () => ({
    useReactions: useReactionsSpy,
}));

describe('useShortReactions', () => {
    it('delegates directly to the shared useReactions hook with the given video id', () => {
        const fakeResult = { isLiked: true, isDisliked: false, handleLike: vi.fn(), handleDislike: vi.fn() };
        useReactionsSpy.mockReturnValue(fakeResult);

        const { result } = renderHook(() => useShortReactions(vid('v1')));

        expect(useReactionsSpy).toHaveBeenCalledWith(vid('v1'));
        expect(result.current).toBe(fakeResult);
    });
});

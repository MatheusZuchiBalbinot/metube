// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAllTags } from '@hooks/useAllTags';
import { makeVideo, vid, tag } from '../helpers/factories';

describe('useAllTags', () => {
    it('returns an empty array for no videos', () => {
        const { result } = renderHook(() => useAllTags([]));
        expect(result.current).toEqual([]);
    });

    it('collects unique, alphabetically sorted tags across videos', () => {
        const videos = [
            makeVideo({ id: vid('v1'), tags: [tag('react'), tag('vitest')] }),
            makeVideo({ id: vid('v2'), tags: [tag('css')] }),
        ];

        const { result } = renderHook(() => useAllTags(videos));

        expect(result.current).toEqual([tag('css'), tag('react'), tag('vitest')]);
    });

    it('deduplicates tags shared across videos', () => {
        const videos = [
            makeVideo({ id: vid('v1'), tags: [tag('shared')] }),
            makeVideo({ id: vid('v2'), tags: [tag('shared')] }),
        ];

        const { result } = renderHook(() => useAllTags(videos));

        expect(result.current).toEqual([tag('shared')]);
    });

    it('returns a stable reference when the videos array is unchanged', () => {
        const videos = [makeVideo({ id: vid('v1'), tags: [tag('a')] })];
        const { result, rerender } = renderHook(({ v }) => useAllTags(v), { initialProps: { v: videos } });
        const first = result.current;

        rerender({ v: videos });

        expect(result.current).toBe(first);
    });
});

import { describe, it, expect } from 'vitest';
import {
    selectHistoryTags,
    selectPublishedVideos,
    selectLikedSet,
    selectDislikedSet,
    selectRecommendations,
    selectWatchedTagFrequency,
    selectVideoEntities,
    makeSelectVideoById,
} from '@store/videoSelectors';
import { makeVideoState, makeVideo, vid, tag } from '../helpers/factories';
import { VideoStatus } from '@models/video';

function withVideo(overrides = {}) {
    return { video: makeVideoState(overrides) };
}

describe('selectHistoryTags', () => {
    it('returns empty when no history', () => {
        const state = withVideo({ watchHistory: [], videos: [] });
        expect(selectHistoryTags(state)).toEqual([]);
    });

    it('returns tags only from watched videos', () => {
        const v1 = makeVideo({ id: vid('v1'), tags: [tag('a'), tag('b')] });
        const v2 = makeVideo({ id: vid('v2'), tags: [tag('c')] });
        const state = withVideo({
            videos: [v1, v2],
            watchHistory: [vid('v1')],
        });

        const tags = selectHistoryTags(state);
        expect(tags).toEqual(expect.arrayContaining([tag('a'), tag('b')]));
        expect(tags).not.toContain(tag('c'));
    });

    it('deduplicates tags across watched videos', () => {
        const v1 = makeVideo({ id: vid('v1'), tags: [tag('shared')] });
        const v2 = makeVideo({ id: vid('v2'), tags: [tag('shared')] });
        const state = withVideo({
            videos: [v1, v2],
            watchHistory: [vid('v1'), vid('v2')],
        });

        expect(selectHistoryTags(state)).toHaveLength(1);
    });
});

describe('selectPublishedVideos', () => {
    it('filters to visible (published) videos', () => {
        const pub = makeVideo({ id: vid('v-pub'), status: VideoStatus.PUBLISHED });
        const draft = makeVideo({ id: vid('v-draft'), status: VideoStatus.DRAFT });
        const state = withVideo({ videos: [pub, draft] });

        const result = selectPublishedVideos(state);
        expect(result.map(v => v.id)).toContain(vid('v-pub'));
        expect(result.map(v => v.id)).not.toContain(vid('v-draft'));
    });
});

describe('selectLikedSet / selectDislikedSet', () => {
    it('returns a Set of liked ids', () => {
        const state = withVideo({ likedVideos: [vid('a'), vid('b')] });
        const liked = selectLikedSet(state);
        expect(liked.has(vid('a'))).toBe(true);
        expect(liked.has(vid('b'))).toBe(true);
        expect(liked.has(vid('c'))).toBe(false);
    });

    it('returns a Set of disliked ids', () => {
        const state = withVideo({ dislikedVideos: [vid('x')] });
        const disliked = selectDislikedSet(state);
        expect(disliked.has(vid('x'))).toBe(true);
    });
});

describe('selectRecommendations', () => {
    it('returns the serverRecommendations slice', () => {
        const state = withVideo({ serverRecommendations: [vid('r1')] });
        expect(selectRecommendations(state)).toEqual([vid('r1')]);
    });
});

describe('selectWatchedTagFrequency', () => {
    it('returns empty map when no history', () => {
        const state = withVideo({ watchHistory: [], videos: [] });
        expect(selectWatchedTagFrequency(state).size).toBe(0);
    });

    it('counts tag occurrences across watched videos', () => {
        const v1 = makeVideo({ id: vid('v1'), tags: [tag('react'), tag('test')] });
        const v2 = makeVideo({ id: vid('v2'), tags: [tag('react')] });
        const state = withVideo({
            videos: [v1, v2],
            watchHistory: [vid('v1'), vid('v2')],
        });

        const freq = selectWatchedTagFrequency(state);
        expect(freq.get(tag('react'))).toBe(2);
        expect(freq.get(tag('test'))).toBe(1);
    });

    it('skips history entries that reference unknown videos', () => {
        const v1 = makeVideo({ id: vid('v1'), tags: [tag('a')] });
        const state = withVideo({
            videos: [v1],
            watchHistory: [vid('v1'), vid('v-missing')],
        });

        const freq = selectWatchedTagFrequency(state);
        expect(freq.get(tag('a'))).toBe(1);
        expect(freq.size).toBe(1);
    });
});

describe('selectVideoEntities', () => {
    it('maps every video by id', () => {
        const v1 = makeVideo({ id: vid('v1') });
        const v2 = makeVideo({ id: vid('v2') });
        const entities = selectVideoEntities(withVideo({ videos: [v1, v2] }));

        expect(entities.get(vid('v1'))).toBe(v1);
        expect(entities.get(vid('v2'))).toBe(v2);
        expect(entities.size).toBe(2);
    });

    it('returns a stable reference while videos are unchanged', () => {
        const state = withVideo({ videos: [makeVideo({ id: vid('v1') })] });
        expect(selectVideoEntities(state)).toBe(selectVideoEntities(state));
    });
});

describe('makeSelectVideoById', () => {
    it('resolves a video by id', () => {
        const v1 = makeVideo({ id: vid('v1'), title: 'Found' });
        const selectV1 = makeSelectVideoById(vid('v1'));

        expect(selectV1(withVideo({ videos: [v1] }))?.title).toBe('Found');
    });

    it('returns undefined for an unknown id', () => {
        const selectMissing = makeSelectVideoById(vid('nope'));
        expect(selectMissing(withVideo({ videos: [makeVideo({ id: vid('v1') })] }))).toBeUndefined();
    });
});

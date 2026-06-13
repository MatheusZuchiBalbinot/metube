// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import videoUiSlice, { videoUiActions } from '@store/videoUiSlice';
import type { VideoId } from '@models/video';
import type { Tag } from '@models/tag';

const vid = (s: string) => s as unknown as VideoId;
const tag = (s: string) => s as unknown as Tag;

const reducer = videoUiSlice.reducer;

function makeState(overrides: object = {}) {
    return {
        uploadModalOpen: false,
        activeTagView: null,
        miniPlayer: null,
        pendingVideoSeek: null,
        ...overrides,
    };
}

describe('videoUiSlice — uploadModal', () => {
    it('opens the upload modal', () => {
        const next = reducer(makeState({ uploadModalOpen: false }), videoUiActions.openUploadModal());
        expect(next.uploadModalOpen).toBe(true);
    });

    it('closes the upload modal', () => {
        const next = reducer(makeState({ uploadModalOpen: true }), videoUiActions.closeUploadModal());
        expect(next.uploadModalOpen).toBe(false);
    });
});

describe('videoUiSlice — tagView', () => {
    it('opens tag view with the given payload', () => {
        const next = reducer(makeState(), videoUiActions.openTagView({ tag: tag('react'), fromVideoId: vid('v1') }));
        expect(next.activeTagView?.tag).toBe(tag('react'));
        expect(next.activeTagView?.fromVideoId).toBe(vid('v1'));
    });

    it('closes tag view', () => {
        const state = makeState({ activeTagView: { tag: tag('react'), fromVideoId: vid('v1') } });
        const next = reducer(state, videoUiActions.closeTagView());
        expect(next.activeTagView).toBeNull();
    });
});

describe('videoUiSlice — miniPlayer', () => {
    it('sets mini player state', () => {
        const next = reducer(makeState(), videoUiActions.openMiniPlayer({ videoId: vid('v1'), currentTime: 30 }));
        expect(next.miniPlayer?.videoId).toBe(vid('v1'));
        expect(next.miniPlayer?.currentTime).toBe(30);
    });

    it('increments seekSession on each open', () => {
        const first = reducer(makeState(), videoUiActions.openMiniPlayer({ videoId: vid('v1'), currentTime: 0 }));
        const second = reducer(first, videoUiActions.openMiniPlayer({ videoId: vid('v1'), currentTime: 10 }));
        expect(second.miniPlayer?.seekSession).toBeGreaterThan(first.miniPlayer?.seekSession ?? -1);
    });

    it('closes mini player', () => {
        const state = makeState({ miniPlayer: { videoId: vid('v1'), currentTime: 0, seekSession: 1 } });
        const next = reducer(state, videoUiActions.closeMiniPlayer());
        expect(next.miniPlayer).toBeNull();
    });
});

describe('videoUiSlice — pendingVideoSeek', () => {
    it('stores the pending seek payload', () => {
        const next = reducer(makeState(), videoUiActions.setPendingVideoSeek({ videoId: vid('v1'), time: 42 }));
        expect(next.pendingVideoSeek?.videoId).toBe(vid('v1'));
        expect(next.pendingVideoSeek?.time).toBe(42);
    });

    it('clears the pending seek', () => {
        const state = makeState({ pendingVideoSeek: { videoId: vid('v1'), time: 42 } });
        const next = reducer(state, videoUiActions.clearPendingVideoSeek());
        expect(next.pendingVideoSeek).toBeNull();
    });
});

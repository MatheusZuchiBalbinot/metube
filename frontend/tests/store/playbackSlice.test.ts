// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import playbackSlice, { playbackActions } from '@store/playbackSlice';
import { videoActions } from '@store/videoSlice';
import type { VideoId } from '@models/video';

const vid = (s: string) => s as unknown as VideoId;

const reducer = playbackSlice.reducer;

function makeState(overrides: object = {}) {
    return {
        autoplay: true,
        pinnedVideoId: null as VideoId | null,
        theaterMode: false,
        shortsMuted: true,
        shortsVolume: 0.8,
        ...overrides,
    };
}

describe('playbackSlice — setAutoplay', () => {
    it('sets autoplay to false', () => {
        const next = reducer(makeState({ autoplay: true }), playbackActions.setAutoplay(false));
        expect(next.autoplay).toBe(false);
    });

    it('sets autoplay to true', () => {
        const next = reducer(makeState({ autoplay: false }), playbackActions.setAutoplay(true));
        expect(next.autoplay).toBe(true);
    });
});

describe('playbackSlice — pinVideo', () => {
    it('sets pinnedVideoId', () => {
        const next = reducer(makeState(), playbackActions.pinVideo(vid('v1')));
        expect(next.pinnedVideoId).toBe(vid('v1'));
    });

    it('unpins when the same video is pinned again', () => {
        const next = reducer(makeState({ pinnedVideoId: vid('v1') }), playbackActions.pinVideo(vid('v1')));
        expect(next.pinnedVideoId).toBeNull();
    });

    it('replaces pinned video', () => {
        const next = reducer(makeState({ pinnedVideoId: vid('v1') }), playbackActions.pinVideo(vid('v2')));
        expect(next.pinnedVideoId).toBe(vid('v2'));
    });
});

describe('playbackSlice — unpinVideo', () => {
    it('sets pinnedVideoId to null', () => {
        const next = reducer(makeState({ pinnedVideoId: vid('v1') }), playbackActions.unpinVideo());
        expect(next.pinnedVideoId).toBeNull();
    });
});

describe('playbackSlice — setTheaterMode', () => {
    it('enables theater mode', () => {
        const next = reducer(makeState({ theaterMode: false }), playbackActions.setTheaterMode(true));
        expect(next.theaterMode).toBe(true);
    });

    it('disables theater mode', () => {
        const next = reducer(makeState({ theaterMode: true }), playbackActions.setTheaterMode(false));
        expect(next.theaterMode).toBe(false);
    });
});

describe('playbackSlice — shorts audio', () => {
    it('sets shorts muted state', () => {
        const next = reducer(makeState({ shortsMuted: false }), playbackActions.setShortsMuted(true));
        expect(next.shortsMuted).toBe(true);
    });

    it('sets shorts volume', () => {
        const next = reducer(makeState({ shortsVolume: 0.5 }), playbackActions.setShortsVolume(0.2));
        expect(next.shortsVolume).toBe(0.2);
    });
});

describe('playbackSlice — xTabSetPinnedVideoId', () => {
    it('sets pinnedVideoId', () => {
        const next = reducer(makeState(), playbackActions.xTabSetPinnedVideoId(vid('vP')));
        expect(next.pinnedVideoId).toBe(vid('vP'));
    });

    it('accepts null', () => {
        const next = reducer(makeState({ pinnedVideoId: vid('v1') }), playbackActions.xTabSetPinnedVideoId(null));
        expect(next.pinnedVideoId).toBeNull();
    });
});

describe('playbackSlice — video/deleteVideo cascade', () => {
    it('clears pinnedVideoId when its video is deleted', () => {
        const next = reducer(makeState({ pinnedVideoId: vid('v1') }), videoActions.deleteVideo(vid('v1')));
        expect(next.pinnedVideoId).toBeNull();
    });

    it('leaves pinnedVideoId untouched for a different video', () => {
        const next = reducer(makeState({ pinnedVideoId: vid('v2') }), videoActions.deleteVideo(vid('v1')));
        expect(next.pinnedVideoId).toBe(vid('v2'));
    });
});

describe('playbackSlice — initialState from localStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetModules();
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('reads pinnedVideoId from localStorage when set', async () => {
        localStorage.setItem('metube:pinned-video', 'vid-pinned');
        const { default: slice } = await import('@store/playbackSlice');
        expect(slice.getInitialState().pinnedVideoId).toBe('vid-pinned');
    });

    it('boolean validator passes for a valid stored boolean', async () => {
        localStorage.setItem('metube:autoplay', 'false');
        const { default: slice } = await import('@store/playbackSlice');
        expect(slice.getInitialState().autoplay).toBe(false);
    });

    it('boolean validator rejects a non-boolean and resets to seed', async () => {
        localStorage.setItem('metube:autoplay', '"not-a-bool"');
        const { default: slice } = await import('@store/playbackSlice');
        expect(slice.getInitialState().autoplay).toBe(true);
    });

    it('shortsMuted boolean validator passes for stored false', async () => {
        localStorage.setItem('metube:shorts-muted', 'false');
        const { default: slice } = await import('@store/playbackSlice');
        expect(slice.getInitialState().shortsMuted).toBe(false);
    });
});

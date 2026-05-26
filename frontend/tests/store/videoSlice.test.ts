// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import videoSlice, { videoActions } from '@store/videoSlice';
import type { Video, VideoId, VideoStatus } from '@models/video';
import type { ChannelId } from '@models/channel';
import type { Tag } from '@models/tag';
import type { Vuid } from '@api';

// ─── Brand cast helpers ───────────────────────────────────────────────────────

const vid = (s: string) => s as unknown as VideoId;
const chId = (s: string) => s as unknown as ChannelId;
const t = (s: string) => s as unknown as Tag;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reducer = videoSlice.reducer;

function makeVideo(overrides: Partial<Video> = {}): Video {
    return {
        id: vid('v-test'),
        title: 'Test',
        description: '',
        tags: [],
        thumbnail: '',
        publishedAt: '2024-01-01T00:00:00Z',
        channel: 'Ch',
        channelId: chId('ch_1'),
        views: 0,
        status: 'published',
        ...overrides,
    };
}

function makeState(overrides: object = {}) {
    return {
        videos: [makeVideo({ id: vid('v1') }), makeVideo({ id: vid('v2') })],
        watchHistory: [] as VideoId[],
        likedVideos: [] as VideoId[],
        dislikedVideos: [] as VideoId[],
        videoProgress: {} as Record<string, number>,
        autoplay: true,
        uploadModalOpen: false,
        activeTagView: null,
        miniPlayer: null,
        pendingVideoSeek: null,
        watchEvents: [],
        pinnedVideoId: null as VideoId | null,
        theaterMode: false,
        shortsMuted: true,
        shortsVolume: 0.8,
        loading: false,
        error: null,
        ...overrides,
    };
}

// ─── updateVideoStatus ────────────────────────────────────────────────────────

describe('videoSlice — updateVideoStatus', () => {
    it('updates the status of a matching video', () => {
        const vuid = (s: string) => s as unknown as Vuid;
        const state = makeState({ videos: [makeVideo({ id: vid('v1'), status: 'published' })] });
        const next = reducer(state, videoActions.updateVideoStatus({ vuid: vuid('v1'), status: 'processing' as VideoStatus }));
        expect(next.videos[0].status).toBe('processing');
    });

    it('sets lastVideoStatusUpdate regardless of whether video is found', () => {
        const vuid = (s: string) => s as unknown as Vuid;
        const state = makeState();
        const next = reducer(state, videoActions.updateVideoStatus({ vuid: vuid('vXX'), status: 'published' as VideoStatus }));
        expect(next.lastVideoStatusUpdate?.vuid).toBe('vXX');
    });
});

// ─── updateVideo ─────────────────────────────────────────────────────────────

describe('videoSlice — updateVideo', () => {
    it('replaces the matching video entirely', () => {
        const state = makeState({ videos: [makeVideo({ id: vid('v1'), title: 'Old' })] });
        const next = reducer(state, videoActions.updateVideo(makeVideo({ id: vid('v1'), title: 'New' })));
        expect(next.videos[0].title).toBe('New');
    });

    it('does nothing when video id is not found', () => {
        const state = makeState();
        const next = reducer(state, videoActions.updateVideo(makeVideo({ id: vid('vXX'), title: 'Ghost' })));
        expect(next.videos).toHaveLength(state.videos.length);
    });
});

// ─── cross-tab sync reducers ──────────────────────────────────────────────────

describe('videoSlice — xTab reducers', () => {
    it('xTabSetLikedVideos replaces likedVideos', () => {
        const state = makeState({ likedVideos: [vid('old')] });
        const next = reducer(state, videoActions.xTabSetLikedVideos([vid('v1'), vid('v2')]));
        expect(next.likedVideos).toEqual([vid('v1'), vid('v2')]);
    });

    it('xTabSetDislikedVideos replaces dislikedVideos', () => {
        const state = makeState({ dislikedVideos: [vid('old')] });
        const next = reducer(state, videoActions.xTabSetDislikedVideos([vid('vD')]));
        expect(next.dislikedVideos).toEqual([vid('vD')]);
    });

    it('xTabSetPinnedVideoId sets pinnedVideoId', () => {
        const state = makeState();
        const next = reducer(state, videoActions.xTabSetPinnedVideoId(vid('vP')));
        expect(next.pinnedVideoId).toBe(vid('vP'));
    });

    it('xTabSetPinnedVideoId accepts null', () => {
        const state = makeState({ pinnedVideoId: vid('v1') });
        const next = reducer(state, videoActions.xTabSetPinnedVideoId(null));
        expect(next.pinnedVideoId).toBeNull();
    });
});

// ─── deleteVideo ──────────────────────────────────────────────────────────────

describe('videoSlice — deleteVideo', () => {
    it('removes the video from the list', () => {
        const state = makeState();
        const next = reducer(state, videoActions.deleteVideo(vid('v1')));
        expect(next.videos.find(v => v.id === 'v1')).toBeUndefined();
        expect(next.videos.find(v => v.id === 'v2')).toBeDefined();
    });

    it('cleans up from watchHistory, liked, disliked', () => {
        const state = makeState({
            watchHistory: [vid('v1'), vid('v2')],
            likedVideos: [vid('v1')],
            dislikedVideos: [vid('v1')],
        });
        const next = reducer(state, videoActions.deleteVideo(vid('v1')));
        expect(next.watchHistory).toEqual([vid('v2')]);
        expect(next.likedVideos).toEqual([]);
        expect(next.dislikedVideos).toEqual([]);
    });

    it('clears pinnedVideoId when deleting pinned video', () => {
        const state = makeState({ pinnedVideoId: vid('v1') });
        const next = reducer(state, videoActions.deleteVideo(vid('v1')));
        expect(next.pinnedVideoId).toBeNull();
    });

    it('does not clear pinnedVideoId for a different video', () => {
        const state = makeState({ pinnedVideoId: vid('v2') });
        const next = reducer(state, videoActions.deleteVideo(vid('v1')));
        expect(next.pinnedVideoId).toBe(vid('v2'));
    });
});

// ─── likeVideo ────────────────────────────────────────────────────────────────

describe('videoSlice — likeVideo', () => {
    it('adds video to likedVideos', () => {
        const state = makeState();
        const next = reducer(state, videoActions.likeVideo(vid('v1')));
        expect(next.likedVideos).toContain(vid('v1'));
    });

    it('removes from dislikedVideos when liked', () => {
        const state = makeState({ dislikedVideos: [vid('v1')] });
        const next = reducer(state, videoActions.likeVideo(vid('v1')));
        expect(next.dislikedVideos).not.toContain(vid('v1'));
    });

    it('toggles off when already liked', () => {
        const state = makeState({ likedVideos: [vid('v1')] });
        const next = reducer(state, videoActions.likeVideo(vid('v1')));
        expect(next.likedVideos).not.toContain(vid('v1'));
    });
});

// ─── dislikeVideo ─────────────────────────────────────────────────────────────

describe('videoSlice — dislikeVideo', () => {
    it('adds video to dislikedVideos', () => {
        const state = makeState();
        const next = reducer(state, videoActions.dislikeVideo(vid('v1')));
        expect(next.dislikedVideos).toContain(vid('v1'));
    });

    it('removes from likedVideos when disliked', () => {
        const state = makeState({ likedVideos: [vid('v1')] });
        const next = reducer(state, videoActions.dislikeVideo(vid('v1')));
        expect(next.likedVideos).not.toContain(vid('v1'));
    });

    it('toggles off when already disliked', () => {
        const state = makeState({ dislikedVideos: [vid('v1')] });
        const next = reducer(state, videoActions.dislikeVideo(vid('v1')));
        expect(next.dislikedVideos).not.toContain(vid('v1'));
    });
});

// ─── watchVideo ───────────────────────────────────────────────────────────────

describe('videoSlice — watchVideo', () => {
    it('adds video to the front of watchHistory', () => {
        const state = makeState({ watchHistory: [vid('v2')] });
        const next = reducer(state, videoActions.watchVideo(vid('v1')));
        expect(next.watchHistory[0]).toBe(vid('v1'));
    });

    it('moves existing entry to front (deduplicates)', () => {
        const state = makeState({ watchHistory: [vid('v2'), vid('v1')] });
        const next = reducer(state, videoActions.watchVideo(vid('v1')));
        expect(next.watchHistory).toEqual([vid('v1'), vid('v2')]);
    });

    it('does not overwrite existing progress', () => {
        const state = makeState({ videoProgress: { v1: 55 } });
        const next = reducer(state, videoActions.watchVideo(vid('v1')));
        expect(next.videoProgress['v1']).toBe(55);
    });

    it('sets initial progress of 10 for first watch', () => {
        const state = makeState();
        const next = reducer(state, videoActions.watchVideo(vid('v1')));
        expect(next.videoProgress['v1']).toBe(10);
    });
});

// ─── pinVideo ─────────────────────────────────────────────────────────────────

describe('videoSlice — pinVideo', () => {
    it('sets pinnedVideoId', () => {
        const state = makeState();
        const next = reducer(state, videoActions.pinVideo(vid('v1')));
        expect(next.pinnedVideoId).toBe(vid('v1'));
    });

    it('unpins when the same video is pinned again', () => {
        const state = makeState({ pinnedVideoId: vid('v1') });
        const next = reducer(state, videoActions.pinVideo(vid('v1')));
        expect(next.pinnedVideoId).toBeNull();
    });

    it('replaces pinned video', () => {
        const state = makeState({ pinnedVideoId: vid('v1') });
        const next = reducer(state, videoActions.pinVideo(vid('v2')));
        expect(next.pinnedVideoId).toBe(vid('v2'));
    });
});

// ─── updateProgress ──────────────────────────────────────────────────────────

describe('videoSlice — updateProgress', () => {
    it('stores the progress percentage', () => {
        const state = makeState();
        const next = reducer(state, videoActions.updateProgress({ videoId: vid('v1'), percent: 72 }));
        expect(next.videoProgress['v1']).toBe(72);
    });

    it('overwrites existing progress', () => {
        const state = makeState({ videoProgress: { v1: 20 } });
        const next = reducer(state, videoActions.updateProgress({ videoId: vid('v1'), percent: 80 }));
        expect(next.videoProgress['v1']).toBe(80);
    });
});

// ─── addVideo ─────────────────────────────────────────────────────────────────

describe('videoSlice — addVideo', () => {
    it('prepends a new video to the list', () => {
        const state = makeState();
        const next = reducer(state, videoActions.addVideo(makeVideo({ id: vid('v-new'), title: 'New' })));
        expect(next.videos).toHaveLength(state.videos.length + 1);
        expect(next.videos[0].title).toBe('New');
    });

    it('places the new video at index 0', () => {
        const state = makeState();
        const next = reducer(state, videoActions.addVideo(makeVideo({ id: vid('v-new'), title: 'New' })));
        expect(next.videos[0].id).toBe(vid('v-new'));
    });
});

// ─── editVideo ────────────────────────────────────────────────────────────────

describe('videoSlice — editVideo', () => {
    it('updates fields on the matching video', () => {
        const state = makeState();
        const next = reducer(state, videoActions.editVideo({ id: vid('v1'), partial: { title: 'Updated' } }));
        expect(next.videos.find(v => v.id === 'v1')?.title).toBe('Updated');
    });

    it('does not affect other videos', () => {
        const state = makeState();
        const next = reducer(state, videoActions.editVideo({ id: vid('v1'), partial: { title: 'Updated' } }));
        expect(next.videos.find(v => v.id === 'v2')?.title).toBe('Test');
    });

    it('does nothing when video id is not found', () => {
        const state = makeState();
        const next = reducer(state, videoActions.editVideo({ id: vid('nonexistent'), partial: { title: 'X' } }));
        expect(next.videos).toHaveLength(state.videos.length);
    });
});

// ─── removeFromHistory ────────────────────────────────────────────────────────

describe('videoSlice — removeFromHistory', () => {
    it('removes the given id from watchHistory', () => {
        const state = makeState({ watchHistory: [vid('v1'), vid('v2')] });
        const next = reducer(state, videoActions.removeFromHistory(vid('v1')));
        expect(next.watchHistory).toEqual([vid('v2')]);
    });

    it('does not affect other entries', () => {
        const state = makeState({ watchHistory: [vid('v1'), vid('v2'), vid('v3')] });
        const next = reducer(state, videoActions.removeFromHistory(vid('v2')));
        expect(next.watchHistory).toEqual([vid('v1'), vid('v3')]);
    });
});

// ─── clearHistory ─────────────────────────────────────────────────────────────

describe('videoSlice — clearHistory', () => {
    it('empties watchHistory', () => {
        const state = makeState({ watchHistory: [vid('v1'), vid('v2')] });
        const next = reducer(state, videoActions.clearHistory());
        expect(next.watchHistory).toEqual([]);
    });
});

// ─── setAutoplay ──────────────────────────────────────────────────────────────

describe('videoSlice — setAutoplay', () => {
    it('sets autoplay to false', () => {
        const state = makeState({ autoplay: true });
        const next = reducer(state, videoActions.setAutoplay(false));
        expect(next.autoplay).toBe(false);
    });

    it('sets autoplay to true', () => {
        const state = makeState({ autoplay: false });
        const next = reducer(state, videoActions.setAutoplay(true));
        expect(next.autoplay).toBe(true);
    });
});

// ─── uploadModal ──────────────────────────────────────────────────────────────

describe('videoSlice — uploadModal', () => {
    it('opens the upload modal', () => {
        const state = makeState({ uploadModalOpen: false });
        const next = reducer(state, videoActions.openUploadModal());
        expect(next.uploadModalOpen).toBe(true);
    });

    it('closes the upload modal', () => {
        const state = makeState({ uploadModalOpen: true });
        const next = reducer(state, videoActions.closeUploadModal());
        expect(next.uploadModalOpen).toBe(false);
    });
});

// ─── tagView ──────────────────────────────────────────────────────────────────

describe('videoSlice — tagView', () => {
    it('opens tag view with the given payload', () => {
        const state = makeState();
        const next = reducer(state, videoActions.openTagView({ tag: t('react'), fromVideoId: vid('v1') }));
        expect(next.activeTagView?.tag).toBe(t('react'));
        expect(next.activeTagView?.fromVideoId).toBe(vid('v1'));
    });

    it('closes tag view', () => {
        const state = makeState({ activeTagView: { tag: t('react'), fromVideoId: vid('v1') } });
        const next = reducer(state, videoActions.closeTagView());
        expect(next.activeTagView).toBeNull();
    });
});

// ─── miniPlayer ───────────────────────────────────────────────────────────────

describe('videoSlice — miniPlayer', () => {
    it('sets mini player state', () => {
        const state = makeState();
        const next = reducer(state, videoActions.openMiniPlayer({ videoId: vid('v1'), currentTime: 30 }));
        expect(next.miniPlayer?.videoId).toBe(vid('v1'));
        expect(next.miniPlayer?.currentTime).toBe(30);
    });

    it('increments seekSession on each open', () => {
        const state = makeState();
        const first = reducer(state, videoActions.openMiniPlayer({ videoId: vid('v1'), currentTime: 0 }));
        const second = reducer(first, videoActions.openMiniPlayer({ videoId: vid('v1'), currentTime: 10 }));
        expect(second.miniPlayer?.seekSession).toBeGreaterThan(first.miniPlayer?.seekSession ?? -1);
    });

    it('closes mini player', () => {
        const state = makeState({ miniPlayer: { videoId: vid('v1'), currentTime: 0, seekSession: 1 } });
        const next = reducer(state, videoActions.closeMiniPlayer());
        expect(next.miniPlayer).toBeNull();
    });
});

// ─── pendingVideoSeek ─────────────────────────────────────────────────────────

describe('videoSlice — pendingVideoSeek', () => {
    it('stores the pending seek payload', () => {
        const state = makeState();
        const next = reducer(state, videoActions.setPendingVideoSeek({ videoId: vid('v1'), time: 42 }));
        expect(next.pendingVideoSeek?.videoId).toBe(vid('v1'));
        expect(next.pendingVideoSeek?.time).toBe(42);
    });

    it('clears the pending seek', () => {
        const state = makeState({ pendingVideoSeek: { videoId: vid('v1'), time: 42 } });
        const next = reducer(state, videoActions.clearPendingVideoSeek());
        expect(next.pendingVideoSeek).toBeNull();
    });
});

// ─── unpinVideo ───────────────────────────────────────────────────────────────

describe('videoSlice — unpinVideo', () => {
    it('sets pinnedVideoId to null', () => {
        const state = makeState({ pinnedVideoId: vid('v1') });
        const next = reducer(state, videoActions.unpinVideo());
        expect(next.pinnedVideoId).toBeNull();
    });
});

// ─── setTheaterMode ───────────────────────────────────────────────────────────

describe('videoSlice — setTheaterMode', () => {
    it('enables theater mode', () => {
        const state = makeState({ theaterMode: false });
        const next = reducer(state, videoActions.setTheaterMode(true));
        expect(next.theaterMode).toBe(true);
    });

    it('disables theater mode', () => {
        const state = makeState({ theaterMode: true });
        const next = reducer(state, videoActions.setTheaterMode(false));
        expect(next.theaterMode).toBe(false);
    });
});

// ─── setShortsMuted / setShortsVolume ─────────────────────────────────────────

describe('videoSlice — shorts audio', () => {
    it('sets shorts muted state', () => {
        const state = makeState({ shortsMuted: false });
        const next = reducer(state, videoActions.setShortsMuted(true));
        expect(next.shortsMuted).toBe(true);
    });

    it('sets shorts volume', () => {
        const state = makeState({ shortsVolume: 0.5 });
        const next = reducer(state, videoActions.setShortsVolume(0.2));
        expect(next.shortsVolume).toBe(0.2);
    });
});

// ─── incrementViews ───────────────────────────────────────────────────────────

describe('videoSlice — incrementViews', () => {
    it('increments views by 1 for the matching video', () => {
        const state = makeState({ videos: [makeVideo({ id: vid('v1'), views: 10 })] });
        const next = reducer(state, videoActions.incrementViews(vid('v1')));
        expect(next.videos[0].views).toBe(11);
    });

    it('does nothing when video id is not found', () => {
        const state = makeState();
        const next = reducer(state, videoActions.incrementViews(vid('nonexistent')));
        expect(next.videos[0].views).toBe(0);
        expect(next.videos[1].views).toBe(0);
    });
});

// ─── restoreHistory ──────────────────────────────────────────────────────────

describe('videoSlice — restoreHistory', () => {
    it('replaces watchHistory with provided array', () => {
        const state = makeState({ watchHistory: [vid('v1')] });
        const next = reducer(state, videoActions.restoreHistory([vid('v2'), vid('v3')]));
        expect(next.watchHistory).toEqual([vid('v2'), vid('v3')]);
    });
});

// ─── setVideoProgress ────────────────────────────────────────────────────────

describe('videoSlice — setVideoProgress', () => {
    it('replaces entire videoProgress map', () => {
        const state = makeState({ videoProgress: { [vid('v1')]: 50 } });
        const next = reducer(state, videoActions.setVideoProgress({ [vid('v2')]: 80 }));
        expect(next.videoProgress[vid('v2')]).toBe(80);
        expect(next.videoProgress[vid('v1')]).toBeUndefined();
    });
});

// ─── videoFinished ───────────────────────────────────────────────────────────

describe('videoSlice — videoFinished', () => {
    it('sets progress to 100 for the video', () => {
        const state = makeState();
        const next = reducer(state, videoActions.videoFinished(vid('v1')));
        expect(next.videoProgress[vid('v1')]).toBe(100);
    });

    it('adds video to front of watchHistory when not already there', () => {
        const state = makeState({ watchHistory: [vid('v2')] });
        const next = reducer(state, videoActions.videoFinished(vid('v1')));
        expect(next.watchHistory[0]).toBe(vid('v1'));
    });

    it('does not duplicate in watchHistory when already present', () => {
        const state = makeState({ watchHistory: [vid('v1')] });
        const next = reducer(state, videoActions.videoFinished(vid('v1')));
        expect(next.watchHistory.filter(id => id === vid('v1'))).toHaveLength(1);
    });
});

// ─── serverRecommendations ───────────────────────────────────────────────────

describe('videoSlice — setServerRecommendations', () => {
    it('sets server recommendations', () => {
        const state = makeState();
        const recs = [makeVideo({ id: vid('v-rec') })];
        const next = reducer(state, videoActions.setServerRecommendations(recs));
        expect(next.serverRecommendations).toHaveLength(1);
        expect(next.serverRecommendations[0].id).toBe(vid('v-rec'));
    });
});

describe('videoSlice — setRecommendationsLoading', () => {
    it('sets recommendationsLoading flag', () => {
        const state = makeState();
        const next = reducer(state, videoActions.setRecommendationsLoading(true));
        expect(next.recommendationsLoading).toBe(true);
    });
});

// ─── initialState from localStorage ──────────────────────────────────────────

describe('videoSlice — initialState from localStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetModules();
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('reads pinnedVideoId from localStorage when set', async () => {
        localStorage.setItem('vidsum:pinned-video', 'vid-pinned');
        const { default: slice } = await import('@store/videoSlice');
        expect(slice.getInitialState().pinnedVideoId).toBe('vid-pinned');
    });

    it('boolean validator passes for a valid stored boolean', async () => {
        localStorage.setItem('vidsum:autoplay', 'false');
        const { default: slice } = await import('@store/videoSlice');
        expect(slice.getInitialState().autoplay).toBe(false);
    });

    it('boolean validator rejects a non-boolean and resets to seed', async () => {
        localStorage.setItem('vidsum:autoplay', '"not-a-bool"');
        const { default: slice } = await import('@store/videoSlice');
        expect(slice.getInitialState().autoplay).toBe(true);
    });

    it('shortsMuted boolean validator passes for stored false', async () => {
        localStorage.setItem('vidsum:shorts-muted', 'false');
        const { default: slice } = await import('@store/videoSlice');
        expect(slice.getInitialState().shortsMuted).toBe(false);
    });
});

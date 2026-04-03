/**
 * Factory functions for creating test data.
 * Used in both component and Redux slice tests.
 */

import type { Video, VideoId } from '@models/video';
import type { ChannelId } from '@models/channel';
import type { Tag } from '@models/tag';
import { VideoStatus } from '@models/video';
import type { User } from '@hooks/useAuth';
import type { RootState } from '@store';

// ─── Brand cast helpers ────────────────────────────────────────────────────

/** Create a branded VideoId from a string. */
export const vid = (s: string): VideoId => s as unknown as VideoId;

/** Create a branded ChannelId from a string. */
export const chId = (s: string): ChannelId => s as unknown as ChannelId;

/** Create a branded Tag from a string. */
export const tag = (s: string): Tag => s as unknown as Tag;

// ─── Video factory ────────────────────────────────────────────────────────

export function makeVideo(overrides: Partial<Video> = {}): Video {
    return {
        id: vid('v-test'),
        title: 'Test Video',
        description: 'Test description',
        tags: [tag('test'), tag('example')],
        thumbnail: 'https://picsum.photos/320/180',
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        scheduledAt: undefined,
        channel: 'Test Channel',
        channelId: chId('ch-test'),
        views: 1000,
        status: VideoStatus.PUBLISHED,
        duration: 600,
        ...overrides,
    };
}

// ─── User factory ──────────────────────────────────────────────────────────

export function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        bio: 'Test bio',
        ...overrides,
    };
}

// ─── Redux State factories ─────────────────────────────────────────────────

export function makeVideoState(overrides: object = {}) {
    return {
        videos: [makeVideo({ id: vid('v1') }), makeVideo({ id: vid('v2') })],
        watchHistory: [] as VideoId[],
        likedVideos: [] as VideoId[],
        dislikedVideos: [] as VideoId[],
        savedVideos: [] as VideoId[],
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

export function makeAuthState(overrides: object = {}) {
    return {
        user: null,
        loading: false,
        sessionError: null,
        ...overrides,
    };
}

export function makeThemeState(overrides: object = {}) {
    return {
        mode: 'dark' as const,
        color: 'violet' as const,
        language: 'pt' as const,
        ...overrides,
    };
}

export function makeRootState(overrides: Partial<RootState> = {}): RootState {
    return {
        video: makeVideoState(),
        auth: makeAuthState(),
        theme: makeThemeState(),
        toast: { toasts: [] },
        subscription: { subscriptions: [] },
        playlist: { playlists: [] },
        search: { recentSearches: [], results: [] },
        ...overrides,
    };
}

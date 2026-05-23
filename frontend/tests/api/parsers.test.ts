// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
    parseVideo,
    parseVideoList,
    parseUser,
    parseUserArray,
    parseLoginResponse,
    parseComment,
    parseCommentList,
    parseCommentReplies,
    parseCommentVersions,
    parsePlaylist,
    parsePlaylistList,
    parseVideoSummary,
    parseVideoTranscription,
    parseToggleLike,
    parseAiSuggestion,
} from '@api/parsers';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeRawVideo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        vuid: 'abc12345678',
        title: 'Test Video',
        description: 'A description',
        status: 'published',
        views: 42,
        duration: 120,
        video_url: 'https://cdn.example.com/video.mp4',
        thumbnail_url: 'https://cdn.example.com/thumb.jpg',
        published_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        scheduled_at: null,
        tags: ['react', 'typescript'],
        captions: [{ lang: 'en', label: 'English', url: '/en.vtt' }],
        channel: 'My Channel',
        channel_id: 'chan-uuid-001',
        ...overrides,
    };
}

function makeRawUser(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        uuid: 'user-uuid-001',
        name: 'Alice',
        email: 'alice@example.com',
        bio: 'Hello world',
        avatar: 'https://cdn.example.com/avatar.jpg',
        email_verified_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

function makeRawComment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        cuid: 'comment-cuid-001',
        content: 'Great video!',
        author: {
            uuid: 'user-uuid-001',
            name: 'Alice',
            avatar: 'https://cdn.example.com/avatar.jpg',
        },
        likes_count: 5,
        is_liked: true,
        is_edited: false,
        replies_count: 2,
        parent_cuid: null,
        created_at: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

function makeRawPlaylist(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        puid: 'playlist-puid-001',
        name: 'Watch Later',
        video_ids: ['vid1', 'vid2'],
        created_at: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

function makePaginatedMeta(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        total: 100,
        current_page: 1,
        per_page: 20,
        last_page: 5,
        ...overrides,
    };
}

// ─── parseVideo ────────────────────────────────────────────────────────────────

describe('parseVideo', () => {
    it('returns a correct Video from valid snake_case input', () => {
        const result = parseVideo(makeRawVideo());

        expect(result).not.toBeNull();
        expect(result!.id).toBe('abc12345678');
        expect(result!.title).toBe('Test Video');
        expect(result!.description).toBe('A description');
        expect(result!.status).toBe('published');
        expect(result!.views).toBe(42);
        expect(result!.duration).toBe(120);
        expect(result!.videoUrl).toBe('https://cdn.example.com/video.mp4');
        expect(result!.thumbnail).toBe('https://cdn.example.com/thumb.jpg');
        expect(result!.publishedAt).toBe('2024-01-01T00:00:00Z');
        expect(result!.createdAt).toBe('2024-01-01T00:00:00Z');
        expect(result!.tags).toEqual(['react', 'typescript']);
        expect(result!.captions).toEqual([{ lang: 'en', label: 'English', url: '/en.vtt' }]);
        expect(result!.channel).toBe('My Channel');
        expect(result!.channelId).toBe('chan-uuid-001');
    });

    it('maps snake_case fields to camelCase', () => {
        const result = parseVideo(makeRawVideo({
            video_url: 'https://cdn.example.com/my.mp4',
            thumbnail_url: 'https://cdn.example.com/my.jpg',
            published_at: '2025-06-01T00:00:00Z',
            created_at: '2025-05-01T00:00:00Z',
            scheduled_at: '2025-07-01T00:00:00Z',
            channel_id: 'chan-uuid-999',
        }));

        expect(result).not.toBeNull();
        expect(result!.videoUrl).toBe('https://cdn.example.com/my.mp4');
        expect(result!.thumbnail).toBe('https://cdn.example.com/my.jpg');
        expect(result!.publishedAt).toBe('2025-06-01T00:00:00Z');
        expect(result!.createdAt).toBe('2025-05-01T00:00:00Z');
        expect(result!.scheduledAt).toBe('2025-07-01T00:00:00Z');
        expect(result!.channelId).toBe('chan-uuid-999');
    });

    it('returns null for null', () => {
        expect(parseVideo(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseVideo(undefined)).toBeNull();
    });

    it('returns null for a string', () => {
        expect(parseVideo('not-an-object')).toBeNull();
    });

    it('returns null for a number', () => {
        expect(parseVideo(42)).toBeNull();
    });

    it('returns null for an array', () => {
        expect(parseVideo([makeRawVideo()])).toBeNull();
    });

    it('returns null when vuid is missing', () => {
        const raw = makeRawVideo();
        delete raw['vuid'];
        expect(parseVideo(raw)).toBeNull();
    });

    it('returns null when vuid is an empty string', () => {
        expect(parseVideo(makeRawVideo({ vuid: '' }))).toBeNull();
    });

    it('falls back to picsum thumbnail when thumbnail_url is absent', () => {
        const result = parseVideo(makeRawVideo({ thumbnail_url: '' }));

        expect(result).not.toBeNull();
        expect(result!.thumbnail).toMatch(/picsum\.photos\/seed\/abc12345678/);
    });

    it('sets videoUrl to undefined when video_url is absent', () => {
        const result = parseVideo(makeRawVideo({ video_url: '' }));

        expect(result).not.toBeNull();
        expect(result!.videoUrl).toBeUndefined();
    });

    it('sets scheduledAt to undefined when scheduled_at is absent', () => {
        const result = parseVideo(makeRawVideo({ scheduled_at: '' }));

        expect(result).not.toBeNull();
        expect(result!.scheduledAt).toBeUndefined();
    });

    it('sets duration to undefined when duration is not a number', () => {
        const result = parseVideo(makeRawVideo({ duration: null }));

        expect(result).not.toBeNull();
        expect(result!.duration).toBeUndefined();
    });

    it('defaults tags to [] when tags field is not an array', () => {
        const result = parseVideo(makeRawVideo({ tags: 'not-an-array' }));

        expect(result).not.toBeNull();
        expect(result!.tags).toEqual([]);
    });

    it('defaults captions to [] when captions field is not an array', () => {
        const result = parseVideo(makeRawVideo({ captions: null }));

        expect(result).not.toBeNull();
        expect(result!.captions).toEqual([]);
    });

    it('uses published_at as createdAt fallback when created_at is absent', () => {
        const raw = makeRawVideo({ created_at: '' });
        const result = parseVideo(raw);

        expect(result).not.toBeNull();
        expect(result!.createdAt).toBe('2024-01-01T00:00:00Z');
    });
});

// ─── parseVideoList ────────────────────────────────────────────────────────────

describe('parseVideoList', () => {
    it('returns correct paginated envelope from valid input', () => {
        const raw = {
            data: [makeRawVideo()],
            meta: makePaginatedMeta(),
        };

        const result = parseVideoList(raw);

        expect(result).not.toBeNull();
        expect(result!.data).toHaveLength(1);
        expect(result!.data[0]!.id).toBe('abc12345678');
        expect(result!.meta.total).toBe(100);
        expect(result!.meta.page).toBe(1);
        expect(result!.meta.perPage).toBe(20);
        expect(result!.meta.lastPage).toBe(5);
    });

    it('maps meta snake_case fields to camelCase', () => {
        const raw = {
            data: [],
            meta: { total: 50, current_page: 3, per_page: 10, last_page: 5 },
        };

        const result = parseVideoList(raw);

        expect(result).not.toBeNull();
        expect(result!.meta.page).toBe(3);
        expect(result!.meta.perPage).toBe(10);
        expect(result!.meta.lastPage).toBe(5);
    });

    it('filters out invalid videos in data array', () => {
        const raw = {
            data: [makeRawVideo(), { invalid: true }, makeRawVideo({ vuid: 'xyz98765432' })],
            meta: makePaginatedMeta(),
        };

        const result = parseVideoList(raw);

        expect(result).not.toBeNull();
        expect(result!.data).toHaveLength(2);
    });

    it('returns data as [] when data field is not an array', () => {
        const raw = { data: null, meta: makePaginatedMeta() };
        const result = parseVideoList(raw);

        expect(result).not.toBeNull();
        expect(result!.data).toEqual([]);
    });

    it('returns null for null', () => {
        expect(parseVideoList(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseVideoList(undefined)).toBeNull();
    });

    it('returns null when meta is missing', () => {
        expect(parseVideoList({ data: [] })).toBeNull();
    });

    it('returns null for a non-object', () => {
        expect(parseVideoList('string')).toBeNull();
        expect(parseVideoList(123)).toBeNull();
    });
});

// ─── parseUser ─────────────────────────────────────────────────────────────────

describe('parseUser', () => {
    it('returns correct User from valid snake_case input', () => {
        const result = parseUser(makeRawUser());

        expect(result).not.toBeNull();
        expect(result!.uuid).toBe('user-uuid-001');
        expect(result!.name).toBe('Alice');
        expect(result!.email).toBe('alice@example.com');
        expect(result!.bio).toBe('Hello world');
        expect(result!.avatar).toBe('https://cdn.example.com/avatar.jpg');
        expect(result!.emailVerifiedAt).toBe('2024-01-01T00:00:00Z');
        expect(result!.createdAt).toBe('2024-01-01T00:00:00Z');
    });

    it('maps snake_case fields to camelCase', () => {
        const result = parseUser(makeRawUser({
            email_verified_at: '2025-01-01T00:00:00Z',
            created_at: '2025-01-01T00:00:00Z',
        }));

        expect(result).not.toBeNull();
        expect(result!.emailVerifiedAt).toBe('2025-01-01T00:00:00Z');
        expect(result!.createdAt).toBe('2025-01-01T00:00:00Z');
    });

    it('sets bio to undefined when bio is absent', () => {
        const result = parseUser(makeRawUser({ bio: '' }));

        expect(result).not.toBeNull();
        expect(result!.bio).toBeUndefined();
    });

    it('sets avatar to undefined when avatar is absent', () => {
        const result = parseUser(makeRawUser({ avatar: '' }));

        expect(result).not.toBeNull();
        expect(result!.avatar).toBeUndefined();
    });

    it('sets emailVerifiedAt to undefined when email_verified_at is absent', () => {
        const result = parseUser(makeRawUser({ email_verified_at: '' }));

        expect(result).not.toBeNull();
        expect(result!.emailVerifiedAt).toBeUndefined();
    });

    it('returns null for null', () => {
        expect(parseUser(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseUser(undefined)).toBeNull();
    });

    it('returns null for a string', () => {
        expect(parseUser('not-an-object')).toBeNull();
    });

    it('returns null for an array', () => {
        expect(parseUser([makeRawUser()])).toBeNull();
    });

    it('returns null when uuid is missing', () => {
        const raw = makeRawUser();
        delete raw['uuid'];
        expect(parseUser(raw)).toBeNull();
    });

    it('returns null when uuid is an empty string', () => {
        expect(parseUser(makeRawUser({ uuid: '' }))).toBeNull();
    });
});

// ─── parseUserArray ────────────────────────────────────────────────────────────

describe('parseUserArray', () => {
    it('returns array of Users from valid input', () => {
        const result = parseUserArray([makeRawUser(), makeRawUser({ uuid: 'user-uuid-002', name: 'Bob' })]);

        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
        expect(result![0]!.name).toBe('Alice');
        expect(result![1]!.name).toBe('Bob');
    });

    it('filters out invalid users', () => {
        const result = parseUserArray([makeRawUser(), { invalid: true }, makeRawUser({ uuid: 'user-uuid-003' })]);

        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
    });

    it('returns null for null', () => {
        expect(parseUserArray(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseUserArray(undefined)).toBeNull();
    });

    it('returns null for a non-array object', () => {
        expect(parseUserArray(makeRawUser())).toBeNull();
    });

    it('returns null for a string', () => {
        expect(parseUserArray('string')).toBeNull();
    });

    it('returns an empty array for an empty array input', () => {
        const result = parseUserArray([]);

        expect(result).not.toBeNull();
        expect(result).toEqual([]);
    });
});

// ─── parseLoginResponse ────────────────────────────────────────────────────────

describe('parseLoginResponse', () => {
    it('returns LoginApiResponse with user from valid input', () => {
        const raw = { user: makeRawUser() };
        const result = parseLoginResponse(raw);

        expect(result).not.toBeNull();
        expect(result!.user.uuid).toBe('user-uuid-001');
        expect(result!.user.name).toBe('Alice');
    });

    it('returns null for null', () => {
        expect(parseLoginResponse(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseLoginResponse(undefined)).toBeNull();
    });

    it('returns null for a non-object', () => {
        expect(parseLoginResponse('string')).toBeNull();
        expect(parseLoginResponse(123)).toBeNull();
    });

    it('returns null when user field is missing', () => {
        expect(parseLoginResponse({})).toBeNull();
    });

    it('returns null when user field is invalid', () => {
        expect(parseLoginResponse({ user: { invalid: true } })).toBeNull();
    });
});

// ─── parseComment ──────────────────────────────────────────────────────────────

describe('parseComment', () => {
    it('returns correct Comment from valid snake_case input', () => {
        const result = parseComment(makeRawComment());

        expect(result).not.toBeNull();
        expect(result!.id).toBe('comment-cuid-001');
        expect(result!.content).toBe('Great video!');
        expect(result!.likesCount).toBe(5);
        expect(result!.isLiked).toBe(true);
        expect(result!.isEdited).toBe(false);
        expect(result!.replyCount).toBe(2);
        expect(result!.parentCuid).toBeUndefined();
        expect(result!.createdAt).toBe('2024-01-01T00:00:00Z');
    });

    it('maps snake_case fields to camelCase', () => {
        const result = parseComment(makeRawComment({
            likes_count: 10,
            is_liked: false,
            is_edited: true,
            replies_count: 3,
            parent_cuid: 'parent-cuid-001',
            created_at: '2025-01-01T00:00:00Z',
        }));

        expect(result).not.toBeNull();
        expect(result!.likesCount).toBe(10);
        expect(result!.isLiked).toBe(false);
        expect(result!.isEdited).toBe(true);
        expect(result!.replyCount).toBe(3);
        expect(result!.parentCuid).toBe('parent-cuid-001');
        expect(result!.createdAt).toBe('2025-01-01T00:00:00Z');
    });

    it('parses nested author correctly', () => {
        const result = parseComment(makeRawComment());

        expect(result).not.toBeNull();
        expect(result!.author.uuid).toBe('user-uuid-001');
        expect(result!.author.name).toBe('Alice');
        expect(result!.author.avatar).toBe('https://cdn.example.com/avatar.jpg');
    });

    it('sets parentCuid to undefined when parent_cuid is absent', () => {
        const result = parseComment(makeRawComment({ parent_cuid: null }));

        expect(result).not.toBeNull();
        expect(result!.parentCuid).toBeUndefined();
    });

    it('returns null for null', () => {
        expect(parseComment(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseComment(undefined)).toBeNull();
    });

    it('returns null for a string', () => {
        expect(parseComment('not-an-object')).toBeNull();
    });

    it('returns null for an array', () => {
        expect(parseComment([makeRawComment()])).toBeNull();
    });

    it('returns null when cuid is missing', () => {
        const raw = makeRawComment();
        delete raw['cuid'];
        expect(parseComment(raw)).toBeNull();
    });

    it('returns null when cuid is empty', () => {
        expect(parseComment(makeRawComment({ cuid: '' }))).toBeNull();
    });

    it('defaults numeric fields to 0 when missing', () => {
        const raw = makeRawComment();
        delete raw['likes_count'];
        delete raw['replies_count'];
        const result = parseComment(raw);

        expect(result).not.toBeNull();
        expect(result!.likesCount).toBe(0);
        expect(result!.replyCount).toBe(0);
    });

    it('defaults boolean fields to false when missing', () => {
        const raw = makeRawComment();
        delete raw['is_liked'];
        delete raw['is_edited'];
        const result = parseComment(raw);

        expect(result).not.toBeNull();
        expect(result!.isLiked).toBe(false);
        expect(result!.isEdited).toBe(false);
    });
});

// ─── parseCommentList ──────────────────────────────────────────────────────────

describe('parseCommentList', () => {
    it('returns correct paginated comment list from valid input', () => {
        const raw = {
            data: [makeRawComment()],
            meta: makePaginatedMeta({ total: 10, current_page: 1, per_page: 10, last_page: 1 }),
        };

        const result = parseCommentList(raw);

        expect(result).not.toBeNull();
        expect(result!.data).toHaveLength(1);
        expect(result!.data[0]!.id).toBe('comment-cuid-001');
        expect(result!.meta.total).toBe(10);
        expect(result!.meta.page).toBe(1);
        expect(result!.meta.perPage).toBe(10);
        expect(result!.meta.lastPage).toBe(1);
    });

    it('filters out invalid comments in data array', () => {
        const raw = {
            data: [makeRawComment(), { invalid: true }, makeRawComment({ cuid: 'comment-cuid-002' })],
            meta: makePaginatedMeta(),
        };

        const result = parseCommentList(raw);

        expect(result).not.toBeNull();
        expect(result!.data).toHaveLength(2);
    });

    it('returns null for null', () => {
        expect(parseCommentList(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseCommentList(undefined)).toBeNull();
    });

    it('returns null when meta is missing', () => {
        expect(parseCommentList({ data: [] })).toBeNull();
    });

    it('returns null for a non-object', () => {
        expect(parseCommentList('string')).toBeNull();
    });

    it('returns data as [] when data field is not an array', () => {
        const raw = { data: null, meta: makePaginatedMeta() };
        const result = parseCommentList(raw);

        expect(result).not.toBeNull();
        expect(result!.data).toEqual([]);
    });
});

// ─── parseCommentReplies ───────────────────────────────────────────────────────

describe('parseCommentReplies', () => {
    it('returns array of Comments from valid input', () => {
        const raw = {
            data: [
                makeRawComment({ cuid: 'reply-001', parent_cuid: 'comment-cuid-001' }),
                makeRawComment({ cuid: 'reply-002', parent_cuid: 'comment-cuid-001' }),
            ],
        };

        const result = parseCommentReplies(raw);

        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
        expect(result![0]!.id).toBe('reply-001');
        expect(result![1]!.id).toBe('reply-002');
    });

    it('filters out invalid replies', () => {
        const raw = {
            data: [makeRawComment({ cuid: 'reply-001' }), { invalid: true }],
        };

        const result = parseCommentReplies(raw);

        expect(result).not.toBeNull();
        expect(result).toHaveLength(1);
    });

    it('returns null for null', () => {
        expect(parseCommentReplies(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseCommentReplies(undefined)).toBeNull();
    });

    it('returns null when data field is not an array', () => {
        expect(parseCommentReplies({ data: null })).toBeNull();
        expect(parseCommentReplies({ notData: [] })).toBeNull();
    });

    it('returns null for a non-object', () => {
        expect(parseCommentReplies('string')).toBeNull();
        expect(parseCommentReplies(123)).toBeNull();
    });
});

// ─── parseCommentVersions ─────────────────────────────────────────────────────

describe('parseCommentVersions', () => {
    it('returns array of CommentVersions from valid input', () => {
        const raw = {
            data: [
                { version: 1, content: 'Original', created_at: '2024-01-01T00:00:00Z' },
                { version: 2, content: 'Edited', created_at: '2024-01-02T00:00:00Z' },
            ],
        };

        const result = parseCommentVersions(raw);

        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
        expect(result![0]!.version).toBe(1);
        expect(result![0]!.content).toBe('Original');
        expect(result![0]!.createdAt).toBe('2024-01-01T00:00:00Z');
        expect(result![1]!.version).toBe(2);
        expect(result![1]!.content).toBe('Edited');
    });

    it('maps snake_case created_at to camelCase createdAt', () => {
        const raw = {
            data: [{ version: 1, content: 'v1', created_at: '2025-06-01T00:00:00Z' }],
        };

        const result = parseCommentVersions(raw);

        expect(result).not.toBeNull();
        expect(result![0]!.createdAt).toBe('2025-06-01T00:00:00Z');
    });

    it('filters out invalid versions', () => {
        const raw = {
            data: [
                { version: 1, content: 'v1', created_at: '2024-01-01T00:00:00Z' },
                null,
                'invalid',
            ],
        };

        const result = parseCommentVersions(raw);

        expect(result).not.toBeNull();
        expect(result).toHaveLength(1);
    });

    it('returns null for null', () => {
        expect(parseCommentVersions(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseCommentVersions(undefined)).toBeNull();
    });

    it('returns null when data field is not an array', () => {
        expect(parseCommentVersions({ data: null })).toBeNull();
        expect(parseCommentVersions({ notData: [] })).toBeNull();
    });

    it('returns null for a non-object', () => {
        expect(parseCommentVersions('string')).toBeNull();
    });
});

// ─── parsePlaylist ─────────────────────────────────────────────────────────────

describe('parsePlaylist', () => {
    it('returns correct Playlist from valid snake_case input', () => {
        const result = parsePlaylist(makeRawPlaylist());

        expect(result).not.toBeNull();
        expect(result!.id).toBe('playlist-puid-001');
        expect(result!.name).toBe('Watch Later');
        expect(result!.videoIds).toEqual(['vid1', 'vid2']);
        expect(result!.createdAt).toBe('2024-01-01T00:00:00Z');
    });

    it('maps snake_case video_ids to camelCase videoIds', () => {
        const result = parsePlaylist(makeRawPlaylist({ video_ids: ['a', 'b', 'c'] }));

        expect(result).not.toBeNull();
        expect(result!.videoIds).toEqual(['a', 'b', 'c']);
    });

    it('defaults videoIds to [] when video_ids is not an array', () => {
        const result = parsePlaylist(makeRawPlaylist({ video_ids: null }));

        expect(result).not.toBeNull();
        expect(result!.videoIds).toEqual([]);
    });

    it('returns null for null', () => {
        expect(parsePlaylist(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parsePlaylist(undefined)).toBeNull();
    });

    it('returns null for a string', () => {
        expect(parsePlaylist('not-an-object')).toBeNull();
    });

    it('returns null for an array', () => {
        expect(parsePlaylist([makeRawPlaylist()])).toBeNull();
    });

    it('returns null when puid is missing', () => {
        const raw = makeRawPlaylist();
        delete raw['puid'];
        expect(parsePlaylist(raw)).toBeNull();
    });

    it('returns null when puid is empty', () => {
        expect(parsePlaylist(makeRawPlaylist({ puid: '' }))).toBeNull();
    });
});

// ─── parsePlaylistList ─────────────────────────────────────────────────────────

describe('parsePlaylistList', () => {
    it('returns array of Playlists from valid input', () => {
        const raw = {
            data: [
                makeRawPlaylist(),
                makeRawPlaylist({ puid: 'playlist-puid-002', name: 'Favourites' }),
            ],
        };

        const result = parsePlaylistList(raw);

        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
        expect(result![0]!.id).toBe('playlist-puid-001');
        expect(result![1]!.name).toBe('Favourites');
    });

    it('filters out invalid playlists', () => {
        const raw = {
            data: [makeRawPlaylist(), { invalid: true }, makeRawPlaylist({ puid: 'playlist-puid-003' })],
        };

        const result = parsePlaylistList(raw);

        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
    });

    it('returns null for null', () => {
        expect(parsePlaylistList(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parsePlaylistList(undefined)).toBeNull();
    });

    it('returns null when data field is not an array', () => {
        expect(parsePlaylistList({ data: null })).toBeNull();
        expect(parsePlaylistList({ notData: [] })).toBeNull();
    });

    it('returns null for a non-object', () => {
        expect(parsePlaylistList('string')).toBeNull();
        expect(parsePlaylistList(123)).toBeNull();
    });
});

// ─── parseVideoSummary ─────────────────────────────────────────────────────────

describe('parseVideoSummary', () => {
    it('returns correct VideoSummary from valid snake_case input', () => {
        const raw = {
            key_points: ['Point A', 'Point B'],
            chapters: [{ timestamp: '0:00', title: 'Intro' }, { timestamp: '1:30', title: 'Body' }],
            reading_mode: '<p>Full text</p>',
        };

        const result = parseVideoSummary(raw);

        expect(result).not.toBeNull();
        expect(result!.keyPoints).toEqual(['Point A', 'Point B']);
        expect(result!.chapters).toEqual([
            { timestamp: '0:00', title: 'Intro' },
            { timestamp: '1:30', title: 'Body' },
        ]);
        expect(result!.readingMode).toBe('<p>Full text</p>');
    });

    it('maps snake_case fields to camelCase', () => {
        const raw = {
            key_points: ['A'],
            chapters: [],
            reading_mode: 'text',
        };

        const result = parseVideoSummary(raw);

        expect(result).not.toBeNull();
        expect(result!.keyPoints).toEqual(['A']);
        expect(result!.readingMode).toBe('text');
    });

    it('defaults keyPoints to [] when key_points is not an array', () => {
        const result = parseVideoSummary({ key_points: null, chapters: [], reading_mode: '' });

        expect(result).not.toBeNull();
        expect(result!.keyPoints).toEqual([]);
    });

    it('defaults chapters to [] when chapters is not an array', () => {
        const result = parseVideoSummary({ key_points: [], chapters: 'not-array', reading_mode: '' });

        expect(result).not.toBeNull();
        expect(result!.chapters).toEqual([]);
    });

    it('returns null for null', () => {
        expect(parseVideoSummary(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseVideoSummary(undefined)).toBeNull();
    });

    it('returns null for a string', () => {
        expect(parseVideoSummary('string')).toBeNull();
    });

    it('returns null for an array', () => {
        expect(parseVideoSummary([])).toBeNull();
    });
});

// ─── parseVideoTranscription ───────────────────────────────────────────────────

describe('parseVideoTranscription', () => {
    it('returns correct VideoTranscription from valid input', () => {
        const raw = {
            status: 'completed',
            language: 'en',
            content: 'Hello world transcript',
        };

        const result = parseVideoTranscription(raw);

        expect(result).not.toBeNull();
        expect(result!.status).toBe('completed');
        expect(result!.language).toBe('en');
        expect(result!.content).toBe('Hello world transcript');
    });

    it('sets language to null when language is not a string', () => {
        const result = parseVideoTranscription({ status: 'pending', language: null, content: null });

        expect(result).not.toBeNull();
        expect(result!.language).toBeNull();
    });

    it('sets content to null when content is not a string', () => {
        const result = parseVideoTranscription({ status: 'processing', language: 'pt', content: null });

        expect(result).not.toBeNull();
        expect(result!.content).toBeNull();
    });

    it('preserves all status values', () => {
        const statuses = ['pending', 'processing', 'completed', 'failed'] as const;

        for (const status of statuses) {
            const result = parseVideoTranscription({ status, language: null, content: null });

            expect(result).not.toBeNull();
            expect(result!.status).toBe(status);
        }
    });

    it('returns null for null', () => {
        expect(parseVideoTranscription(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseVideoTranscription(undefined)).toBeNull();
    });

    it('returns null for a string', () => {
        expect(parseVideoTranscription('string')).toBeNull();
    });

    it('returns null for an array', () => {
        expect(parseVideoTranscription([])).toBeNull();
    });
});

// ─── parseToggleLike ──────────────────────────────────────────────────────────

describe('parseToggleLike', () => {
    it('returns correct ToggleLikeApiResponse from valid snake_case input', () => {
        const raw = { liked: true, likes_count: 42 };
        const result = parseToggleLike(raw);

        expect(result).not.toBeNull();
        expect(result!.liked).toBe(true);
        expect(result!.likesCount).toBe(42);
    });

    it('maps snake_case likes_count to camelCase likesCount', () => {
        const result = parseToggleLike({ liked: false, likes_count: 0 });

        expect(result).not.toBeNull();
        expect(result!.likesCount).toBe(0);
    });

    it('defaults liked to false when not a boolean', () => {
        const result = parseToggleLike({ liked: null, likes_count: 5 });

        expect(result).not.toBeNull();
        expect(result!.liked).toBe(false);
    });

    it('defaults likesCount to 0 when not a number', () => {
        const result = parseToggleLike({ liked: true, likes_count: null });

        expect(result).not.toBeNull();
        expect(result!.likesCount).toBe(0);
    });

    it('returns null for null', () => {
        expect(parseToggleLike(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseToggleLike(undefined)).toBeNull();
    });

    it('returns null for a string', () => {
        expect(parseToggleLike('string')).toBeNull();
    });

    it('returns null for an array', () => {
        expect(parseToggleLike([])).toBeNull();
    });

    it('returns null for a number', () => {
        expect(parseToggleLike(42)).toBeNull();
    });
});

// ─── parseAiSuggestion ─────────────────────────────────────────────────────────

describe('parseAiSuggestion', () => {
    it('returns a correct AiSuggestion from valid snake_case input', () => {
        const raw = {
            status: 'pending',
            suggested_title: 'Better Title',
            suggested_description: 'Better Description',
            suggested_tags: ['tag1', 'tag2', 'tag3'],
        };

        const result = parseAiSuggestion(raw);

        expect(result).toEqual({
            status: 'pending',
            suggestedTitle: 'Better Title',
            suggestedDescription: 'Better Description',
            suggestedTags: ['tag1', 'tag2', 'tag3'],
        });
    });

    it('handles accepted status', () => {
        const raw = {
            status: 'accepted',
            suggested_title: 'Title',
            suggested_description: 'Desc',
            suggested_tags: [],
        };

        const result = parseAiSuggestion(raw);

        expect(result?.status).toBe('accepted');
    });

    it('handles dismissed status', () => {
        const raw = {
            status: 'dismissed',
            suggested_title: 'Title',
            suggested_description: 'Desc',
            suggested_tags: [],
        };

        const result = parseAiSuggestion(raw);

        expect(result?.status).toBe('dismissed');
    });

    it('returns null when status is missing', () => {
        const raw = {
            suggested_title: 'Title',
            suggested_description: 'Desc',
            suggested_tags: [],
        };

        const result = parseAiSuggestion(raw);

        expect(result).toBeNull();
    });

    it('handles empty tags array', () => {
        const raw = {
            status: 'pending',
            suggested_title: 'Title',
            suggested_description: 'Desc',
            suggested_tags: [],
        };

        const result = parseAiSuggestion(raw);

        expect(result?.suggestedTags).toEqual([]);
    });

    it('handles non-array tags', () => {
        const raw = {
            status: 'pending',
            suggested_title: 'Title',
            suggested_description: 'Desc',
            suggested_tags: 'not-an-array',
        };

        const result = parseAiSuggestion(raw);

        expect(result?.suggestedTags).toEqual([]);
    });

    it('returns null for null', () => {
        expect(parseAiSuggestion(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseAiSuggestion(undefined)).toBeNull();
    });

    it('returns null for a string', () => {
        expect(parseAiSuggestion('string')).toBeNull();
    });

    it('returns null for an array', () => {
        expect(parseAiSuggestion([])).toBeNull();
    });

    it('returns null for a number', () => {
        expect(parseAiSuggestion(42)).toBeNull();
    });
});

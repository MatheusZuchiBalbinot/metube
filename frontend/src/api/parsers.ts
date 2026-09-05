import type {
    Video, VideoId, VideoCaption, Seconds, ViewCount, User, UserId, ChannelId, Comment,
    Cuid, CommentVersion, Playlist, PlaylistId, Tag, PaginatedResponse,
} from '@models';
import { VideoStatus } from '@models';

export type KeyPoint = string & { readonly _brand: 'KeyPoint' };

export interface VideoSummary {
    keyPoints: KeyPoint[]
    chapters: { timestamp: string; title: string }[]
    readingMode: string
}

export interface VideoTranscription {
    status: 'pending' | 'processing' | 'completed' | 'failed'
    language: string | null
    content: string | null
}

export interface AiSuggestion {
    status: 'pending' | 'accepted' | 'dismissed'
    suggestedTitle: string
    suggestedDescription: string
    suggestedTags: Tag[]
}

export interface LoginApiResponse {
    user: User
}

export interface ToggleLikeApiResponse {
    liked: boolean
    likesCount: number
}

export type VideoListApiResponse = PaginatedResponse<Video>;
export type CommentListApiResponse = PaginatedResponse<Comment>;

type Raw = Record<string, unknown>;

function toRaw(value: unknown): Raw | null {
    const isNonArrayObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    return isNonArrayObject ? (value as Raw) : null;
}

function str(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
    return typeof value === 'number' ? value : 0;
}

function bool(value: unknown): boolean {
    return typeof value === 'boolean' ? value : false;
}

const VIDEO_STATUSES: readonly string[] = Object.values(VideoStatus);

function isVideoStatus(value: string): value is VideoStatus {
    return VIDEO_STATUSES.includes(value);
}

const TRANSCRIPTION_STATUSES: readonly string[] = ['pending', 'processing', 'completed', 'failed'];

function isTranscriptionStatus(value: string): value is VideoTranscription['status'] {
    return TRANSCRIPTION_STATUSES.includes(value);
}

const SUGGESTION_STATUSES: readonly string[] = ['pending', 'accepted', 'dismissed'];

function isSuggestionStatus(value: string): value is AiSuggestion['status'] {
    return SUGGESTION_STATUSES.includes(value);
}

/** Single-cast helper for branded types constructed at the API boundary. */
function brand<T>(value: string | number): T {
    return value as unknown as T;
}

// ─── Generic envelope factories ─────────────────────────────────────────────────
//
// Both shapes below mirror the Laravel `JsonResource` envelope exactly, so a
// per-collection copy of either one is a maintenance trap: a field added on the
// backend (e.g. `from`/`to` on pagination) has to be remembered in every copy.

/**
 * Builds a parser for a Laravel paginated envelope: `{ data: T[], meta: {...} }`.
 * `item` parses a single row; rows that fail to parse are dropped. Returns null
 * when the envelope or its `meta` block is missing.
 */
function paginatedParser<T>(item: (raw: unknown) => T | null): (raw: unknown) => PaginatedResponse<T> | null {
    return (raw: unknown) => {
        const rawData = toRaw(raw);

        if (!rawData) {
            return null;
        }

        const meta = toRaw(rawData['meta']);

        if (!meta) {
            return null;
        }

        const rows = Array.isArray(rawData['data'])
            ? rawData['data'].map(item).filter((row): row is T => row !== null)
            : [];

        return {
            data: rows,
            meta: {
                total: num(meta['total']),
                page: num(meta['current_page']),
                perPage: num(meta['per_page']),
                lastPage: num(meta['last_page']),
            },
        };
    };
}

/**
 * Builds a parser for a bare Laravel resource collection: `{ data: T[] }` (no
 * pagination `meta`). `item` parses a single row; rows that fail to parse are
 * dropped. Returns null when the envelope's `data` array is missing entirely.
 */
function collectionParser<T>(item: (raw: unknown) => T | null): (raw: unknown) => T[] | null {
    return (raw: unknown) => {
        const rawData = toRaw(raw);

        if (!rawData || !Array.isArray(rawData['data'])) {
            return null;
        }

        return rawData['data'].map(item).filter((row): row is T => row !== null);
    };
}

function resolveVideoDates(rawData: Raw): { createdAt: string; publishedAt: string } {
    const createdAt = str(rawData['created_at']) || str(rawData['published_at']) || new Date().toISOString();
    const publishedAt = str(rawData['published_at']) || createdAt;

    return { createdAt, publishedAt };
}

function resolveVideoStatus(rawData: Raw): VideoStatus {
    const rawStatus = str(rawData['status']);

    return isVideoStatus(rawStatus) ? rawStatus : VideoStatus.PROCESSING;
}

function resolveVideoMedia(rawData: Raw, vuid: string): { videoUrl?: string; hlsUrl?: string; thumbnail: string } {
    return {
        videoUrl: str(rawData['video_url']) || undefined,
        hlsUrl: str(rawData['hls_url']) || undefined,
        thumbnail: str(rawData['thumbnail_url']) || `https://picsum.photos/seed/${vuid}/320/180`,
    };
}

function resolveVideoTagsAndCaptions(rawData: Raw): { tags: Tag[]; captions: VideoCaption[] } {
    return {
        tags: Array.isArray(rawData['tags']) ? (rawData['tags'] as Tag[]) : [],
        captions: Array.isArray(rawData['captions']) ? (rawData['captions'] as VideoCaption[]) : [],
    };
}

function resolveChannelSubscribers(rawData: Raw): number | undefined {
    return typeof rawData['channel_subscribers'] === 'number' ? rawData['channel_subscribers'] : undefined;
}

export function parseVideo(raw: unknown): Video | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const vuid = str(rawData['vuid']);

    if (!vuid) {
        return null;
    }

    const { createdAt, publishedAt } = resolveVideoDates(rawData);
    const { tags, captions } = resolveVideoTagsAndCaptions(rawData);

    return {
        id: brand<VideoId>(vuid),
        title: str(rawData['title']),
        description: str(rawData['description']),
        status: resolveVideoStatus(rawData),
        views: num(rawData['views']) as unknown as ViewCount,
        duration: typeof rawData['duration'] === 'number' ? rawData['duration'] as unknown as Seconds : undefined,
        ...resolveVideoMedia(rawData, vuid),
        publishedAt,
        createdAt,
        scheduledAt: str(rawData['scheduled_at']) || undefined,
        tags,
        captions,
        channel: str(rawData['channel']),
        channelId: brand<ChannelId>(str(rawData['channel_id'])),
        channelSubscribers: resolveChannelSubscribers(rawData),
    };
}

export const parseVideoList = paginatedParser<Video>(parseVideo);

/**
 * Parse a non-paginated video collection such as `/recommendations`, which returns
 * `{ data: [...] }` (a resource collection) with no pagination `meta`. Accepts a bare
 * array too. Returns null only when the envelope is missing its `data` array entirely.
 */
export function parseVideoCollection(raw: unknown): Video[] | null {
    if (Array.isArray(raw)) {
        return raw.map(parseVideo).filter((video): video is Video => video !== null);
    }

    return collectionParser<Video>(parseVideo)(raw);
}

export function parseUser(raw: unknown): User | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const uuid = str(rawData['uuid']);

    if (!uuid) {
        return null;
    }

    return {
        id: brand<UserId>(uuid),
        uuid,
        name: str(rawData['name']),
        email: str(rawData['email']),
        bio: str(rawData['bio']) || undefined,
        avatar: str(rawData['avatar']) || undefined,
        emailVerifiedAt: str(rawData['email_verified_at']) || undefined,
        createdAt: str(rawData['created_at']),
    };
}

export function parseUserArray(raw: unknown): User[] | null {
    if (!Array.isArray(raw)) {
        return null;
    }

    return raw.map(parseUser).filter((user): user is User => user !== null);
}

export function parseLoginResponse(raw: unknown): LoginApiResponse | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const user = parseUser(rawData['user']);

    if (!user) {
        return null;
    }

    return { user };
}

function parseCommentAuthor(raw: unknown): Comment['author'] {
    const rawData = toRaw(raw) ?? {};

    return {
        uuid: str(rawData['uuid']),
        name: str(rawData['name']),
        avatar: str(rawData['avatar']),
    };
}

export function parseComment(raw: unknown): Comment | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const cuid = str(rawData['cuid']);

    if (!cuid) {
        return null;
    }

    const rawParentCuid = str(rawData['parent_cuid']) || undefined;

    return {
        id: brand<Cuid>(cuid),
        content: str(rawData['content']),
        author: parseCommentAuthor(rawData['author']),
        likesCount: num(rawData['likes_count']),
        isLiked: bool(rawData['is_liked']),
        isEdited: bool(rawData['is_edited']),
        replyCount: num(rawData['replies_count']),
        parentCuid: rawParentCuid !== undefined ? brand<Cuid>(rawParentCuid) : undefined,
        createdAt: str(rawData['created_at']),
    };
}

export const parseCommentList = paginatedParser<Comment>(parseComment);

export const parseCommentReplies = collectionParser<Comment>(parseComment);

export function parseToggleLike(raw: unknown): ToggleLikeApiResponse | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    return {
        liked: bool(rawData['liked']),
        likesCount: num(rawData['likes_count']),
    };
}

export function parseCommentVersion(raw: unknown): CommentVersion | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    return {
        version: num(rawData['version']),
        content: str(rawData['content']),
        createdAt: str(rawData['created_at']),
    };
}

export const parseCommentVersions = collectionParser<CommentVersion>(parseCommentVersion);

export function parsePlaylist(raw: unknown): Playlist | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const puid = str(rawData['puid']);

    if (!puid) {
        return null;
    }

    return {
        id: brand<PlaylistId>(puid),
        name: str(rawData['name']),
        videoIds: Array.isArray(rawData['video_ids']) ? (rawData['video_ids'] as Playlist['videoIds']) : [],
        createdAt: str(rawData['created_at']),
    };
}

export const parsePlaylistList = collectionParser<Playlist>(parsePlaylist);

export function parseVideoSummary(raw: unknown): VideoSummary | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const keyPoints = Array.isArray(rawData['key_points']) ? (rawData['key_points'] as unknown as KeyPoint[]) : [];
    const chapters = Array.isArray(rawData['chapters']) ? (rawData['chapters'] as VideoSummary['chapters']) : [];
    const readingMode = str(rawData['reading_mode']);

    // The backend returns an EmptyVideoSummary sentinel ({key_points: [], chapters: [],
    // reading_mode: ''}) instead of 404 while the AI summary is still being generated.
    // Map it back to null so callers can distinguish "not ready yet" from a real summary.
    const isEmpty = keyPoints.length === 0 && chapters.length === 0 && readingMode.trim() === '';
    if (isEmpty) {
        return null;
    }

    return { keyPoints, chapters, readingMode };
}

export function parseVideoTranscription(raw: unknown): VideoTranscription | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const rawStatus = str(rawData['status']);

    return {
        status: isTranscriptionStatus(rawStatus) ? rawStatus : 'pending',
        language: typeof rawData['language'] === 'string' ? rawData['language'] : null,
        content: typeof rawData['content'] === 'string' ? rawData['content'] : null,
    };
}

export function parseAiSuggestion(raw: unknown): AiSuggestion | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const status = str(rawData['status']);

    if (!status) {
        return null;
    }

    return {
        status: isSuggestionStatus(status) ? status : 'pending',
        suggestedTitle: str(rawData['suggested_title']),
        suggestedDescription: str(rawData['suggested_description']),
        suggestedTags: Array.isArray(rawData['suggested_tags']) ? (rawData['suggested_tags'] as unknown as Tag[]) : [],
    };
}

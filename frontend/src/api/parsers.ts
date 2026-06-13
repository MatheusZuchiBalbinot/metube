import type { Video, VideoId, VideoCaption, Seconds, ViewCount, User, UserId, ChannelId, Comment, Cuid, CommentVersion, Playlist, PlaylistId, Tag, PaginatedResponse } from '@models';
import { VideoStatus } from '@models';

// ─── Shared types ──────────────────────────────────────────────────────────────

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

// ─── Primitives ────────────────────────────────────────────────────────────────

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

// ─── Video ─────────────────────────────────────────────────────────────────────

export function parseVideo(raw: unknown): Video | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const vuid = str(rawData['vuid']);

    if (!vuid) {
        return null;
    }

    const createdAt = str(rawData['created_at']) || str(rawData['published_at']) || new Date().toISOString();

    const rawStatus = str(rawData['status']);
    const status: VideoStatus = isVideoStatus(rawStatus) ? rawStatus : VideoStatus.PROCESSING;

    return {
        id: brand<VideoId>(vuid),
        title: str(rawData['title']),
        description: str(rawData['description']),
        status,
        views: num(rawData['views']) as unknown as ViewCount,
        duration: typeof rawData['duration'] === 'number' ? rawData['duration'] as unknown as Seconds : undefined,
        videoUrl: str(rawData['video_url']) || undefined,
        hlsUrl: str(rawData['hls_url']) || undefined,
        thumbnail: str(rawData['thumbnail_url']) || `https://picsum.photos/seed/${vuid}/320/180`,
        publishedAt: str(rawData['published_at']) || createdAt,
        createdAt,
        scheduledAt: str(rawData['scheduled_at']) || undefined,
        tags: Array.isArray(rawData['tags']) ? (rawData['tags'] as Tag[]) : [],
        captions: Array.isArray(rawData['captions']) ? (rawData['captions'] as VideoCaption[]) : [],
        channel: str(rawData['channel']),
        channelId: brand<ChannelId>(str(rawData['channel_id'])),
        channelSubscribers: typeof rawData['channel_subscribers'] === 'number' ? rawData['channel_subscribers'] : undefined,
    };
}

export function parseVideoList(raw: unknown): VideoListApiResponse | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const meta = toRaw(rawData['meta']);

    if (!meta) {
        return null;
    }

    const videos = Array.isArray(rawData['data'])
        ? rawData['data'].map(parseVideo).filter((video): video is Video => video !== null)
        : [];

    return {
        data: videos,
        meta: {
            total: num(meta['total']),
            page: num(meta['current_page']),
            perPage: num(meta['per_page']),
            lastPage: num(meta['last_page']),
        },
    };
}

/**
 * Parse a non-paginated video collection such as `/recommendations`, which returns
 * `{ data: [...] }` (a resource collection) with no pagination `meta`. Accepts a bare
 * array too. Returns null only when the envelope is missing its `data` array entirely.
 */
export function parseVideoCollection(raw: unknown): Video[] | null {
    if (Array.isArray(raw)) {
        return raw.map(parseVideo).filter((video): video is Video => video !== null);
    }

    const rawData = toRaw(raw);

    if (rawData === null || !Array.isArray(rawData['data'])) {
        return null;
    }

    return rawData['data'].map(parseVideo).filter((video): video is Video => video !== null);
}

// ─── User ──────────────────────────────────────────────────────────────────────

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

// ─── Comment ───────────────────────────────────────────────────────────────────

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

export function parseCommentList(raw: unknown): CommentListApiResponse | null {
    const rawData = toRaw(raw);

    if (!rawData) {
        return null;
    }

    const meta = toRaw(rawData['meta']);

    if (!meta) {
        return null;
    }

    const comments = Array.isArray(rawData['data'])
        ? rawData['data'].map(parseComment).filter((comment): comment is Comment => comment !== null)
        : [];

    return {
        data: comments,
        meta: {
            total: num(meta['total']),
            page: num(meta['current_page']),
            perPage: num(meta['per_page']),
            lastPage: num(meta['last_page']),
        },
    };
}

export function parseCommentReplies(raw: unknown): Comment[] | null {
    const rawData = toRaw(raw);

    if (!rawData || !Array.isArray(rawData['data'])) {
        return null;
    }

    return rawData['data'].map(parseComment).filter((comment): comment is Comment => comment !== null);
}

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

export function parseCommentVersions(raw: unknown): CommentVersion[] | null {
    const rawData = toRaw(raw);

    if (!rawData || !Array.isArray(rawData['data'])) {
        return null;
    }

    return rawData['data'].map(parseCommentVersion).filter((version): version is CommentVersion => version !== null);
}

// ─── Playlist ──────────────────────────────────────────────────────────────────

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

export function parsePlaylistList(raw: unknown): Playlist[] | null {
    const rawData = toRaw(raw);

    if (!rawData || !Array.isArray(rawData['data'])) {
        return null;
    }

    return rawData['data'].map(parsePlaylist).filter((playlist): playlist is Playlist => playlist !== null);
}

// ─── Video Summary ─────────────────────────────────────────────────────────────

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

// ─── Transcription ─────────────────────────────────────────────────────────────

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

// ─── AI Suggestion ─────────────────────────────────────────────────────────────

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

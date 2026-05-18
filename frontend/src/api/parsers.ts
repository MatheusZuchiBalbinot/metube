import type { Video, VideoId, VideoCaption, VideoStatus } from '@models/video';
import type { User, UserId } from '@models/user';
import type { ChannelId } from '@models/channel';
import type { Comment, Cuid, CommentVersion } from '@models/comment';
import type { Playlist, PlaylistId } from '@models/playlist';
import type { Tag } from '@models/tag';
import type { PaginatedResponse } from '@models/common';

// ─── Shared types ──────────────────────────────────────────────────────────────

export interface VideoSummary {
    keyPoints: string[]
    chapters: { timestamp: string; title: string }[]
    readingMode: string
}

export interface VideoTranscription {
    status: 'pending' | 'processing' | 'completed' | 'failed'
    language: string | null
    content: string | null
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

function toRaw(v: unknown): Raw | null {
    const isNonArrayObject = v !== null && typeof v === 'object' && !Array.isArray(v);
    return isNonArrayObject ? (v as Raw) : null;
}

function str(v: unknown): string {
    return typeof v === 'string' ? v : '';
}

function num(v: unknown): number {
    return typeof v === 'number' ? v : 0;
}

function bool(v: unknown): boolean {
    return typeof v === 'boolean' ? v : false;
}

// ─── Video ─────────────────────────────────────────────────────────────────────

export function parseVideo(raw: unknown): Video | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    const vuid = str(r['vuid']);

    if (!vuid) {
        return null;
    }

    const createdAt = str(r['created_at']) || str(r['published_at']) || new Date().toISOString();

    return {
        id: vuid as unknown as VideoId,
        title: str(r['title']),
        description: str(r['description']),
        status: str(r['status']) as VideoStatus,
        views: num(r['views']),
        duration: typeof r['duration'] === 'number' ? r['duration'] : undefined,
        videoUrl: str(r['video_url']) || undefined,
        thumbnail: str(r['thumbnail_url']) || `https://picsum.photos/seed/${vuid}/320/180`,
        publishedAt: str(r['published_at']) || createdAt,
        createdAt,
        scheduledAt: str(r['scheduled_at']) || undefined,
        tags: Array.isArray(r['tags']) ? (r['tags'] as Tag[]) : [],
        captions: Array.isArray(r['captions']) ? (r['captions'] as VideoCaption[]) : [],
        channel: str(r['channel']),
        channelId: str(r['channel_id']) as unknown as ChannelId,
    };
}

export function parseVideoList(raw: unknown): VideoListApiResponse | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    const meta = toRaw(r['meta']);

    if (!meta) {
        return null;
    }

    const data = Array.isArray(r['data'])
        ? r['data'].map(parseVideo).filter((v): v is Video => v !== null)
        : [];

    return {
        data,
        meta: {
            total: num(meta['total']),
            page: num(meta['current_page']),
            perPage: num(meta['per_page']),
            lastPage: num(meta['last_page']),
        },
    };
}

// ─── User ──────────────────────────────────────────────────────────────────────

export function parseUser(raw: unknown): User | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    const uuid = str(r['uuid']);

    if (!uuid) {
        return null;
    }

    return {
        id: uuid as unknown as UserId,
        uuid,
        name: str(r['name']),
        email: str(r['email']),
        bio: str(r['bio']) || undefined,
        avatar: str(r['avatar']) || undefined,
        emailVerifiedAt: str(r['email_verified_at']) || undefined,
        createdAt: str(r['created_at']),
    };
}

export function parseUserArray(raw: unknown): User[] | null {
    if (!Array.isArray(raw)) {
        return null;
    }

    return raw.map(parseUser).filter((u): u is User => u !== null);
}

export function parseLoginResponse(raw: unknown): LoginApiResponse | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    const user = parseUser(r['user']);

    if (!user) {
        return null;
    }

    return { user };
}

// ─── Comment ───────────────────────────────────────────────────────────────────

function parseCommentAuthor(raw: unknown): Comment['author'] {
    const r = toRaw(raw) ?? {};

    return {
        uuid: str(r['uuid']),
        name: str(r['name']),
        avatar: str(r['avatar']),
    };
}

export function parseComment(raw: unknown): Comment | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    const cuid = str(r['cuid']);

    if (!cuid) {
        return null;
    }

    const rawParentCuid = str(r['parent_cuid']) || undefined;

    return {
        id: cuid as unknown as Cuid,
        content: str(r['content']),
        author: parseCommentAuthor(r['author']),
        likesCount: num(r['likes_count']),
        isLiked: bool(r['is_liked']),
        isEdited: bool(r['is_edited']),
        replyCount: num(r['replies_count']),
        parentCuid: rawParentCuid as unknown as Cuid | undefined,
        createdAt: str(r['created_at']),
    };
}

export function parseCommentList(raw: unknown): CommentListApiResponse | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    const meta = toRaw(r['meta']);

    if (!meta) {
        return null;
    }

    const data = Array.isArray(r['data'])
        ? r['data'].map(parseComment).filter((c): c is Comment => c !== null)
        : [];

    return {
        data,
        meta: {
            total: num(meta['total']),
            page: num(meta['current_page']),
            perPage: num(meta['per_page']),
            lastPage: num(meta['last_page']),
        },
    };
}

export function parseCommentReplies(raw: unknown): Comment[] | null {
    const r = toRaw(raw);

    if (!r || !Array.isArray(r['data'])) {
        return null;
    }

    return r['data'].map(parseComment).filter((c): c is Comment => c !== null);
}

export function parseToggleLike(raw: unknown): ToggleLikeApiResponse | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    return {
        liked: bool(r['liked']),
        likesCount: num(r['likes_count']),
    };
}

export function parseCommentVersion(raw: unknown): CommentVersion | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    return {
        version: num(r['version']),
        content: str(r['content']),
        createdAt: str(r['created_at']),
    };
}

export function parseCommentVersions(raw: unknown): CommentVersion[] | null {
    const r = toRaw(raw);

    if (!r || !Array.isArray(r['data'])) {
        return null;
    }

    return r['data'].map(parseCommentVersion).filter((v): v is CommentVersion => v !== null);
}

// ─── Playlist ──────────────────────────────────────────────────────────────────

export function parsePlaylist(raw: unknown): Playlist | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    const puid = str(r['puid']);

    if (!puid) {
        return null;
    }

    return {
        id: puid as unknown as PlaylistId,
        name: str(r['name']),
        videoIds: Array.isArray(r['video_ids']) ? (r['video_ids'] as Playlist['videoIds']) : [],
        createdAt: str(r['created_at']),
    };
}

export function parsePlaylistList(raw: unknown): Playlist[] | null {
    const r = toRaw(raw);

    if (!r || !Array.isArray(r['data'])) {
        return null;
    }

    return r['data'].map(parsePlaylist).filter((p): p is Playlist => p !== null);
}

// ─── Video Summary ─────────────────────────────────────────────────────────────

export function parseVideoSummary(raw: unknown): VideoSummary | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    return {
        keyPoints: Array.isArray(r['key_points']) ? (r['key_points'] as string[]) : [],
        chapters: Array.isArray(r['chapters']) ? (r['chapters'] as VideoSummary['chapters']) : [],
        readingMode: str(r['reading_mode']),
    };
}

// ─── Transcription ─────────────────────────────────────────────────────────────

export function parseVideoTranscription(raw: unknown): VideoTranscription | null {
    const r = toRaw(raw);

    if (!r) {
        return null;
    }

    return {
        status: str(r['status']) as VideoTranscription['status'],
        language: typeof r['language'] === 'string' ? r['language'] : null,
        content: typeof r['content'] === 'string' ? r['content'] : null,
    };
}

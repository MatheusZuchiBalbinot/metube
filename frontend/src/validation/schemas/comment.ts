import { z } from 'zod';
import type { Cuid } from '@models/comment';

const commentAuthorSchema = z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    avatar: z.string().nullable().transform(v => v ?? ''),
});

export const CommentApiSchema = z.object({
    cuid: z.string().min(1),
    content: z.string(),
    author: commentAuthorSchema,
    likes_count: z.number().int().nonnegative().nullable().transform(v => v ?? 0),
    replies_count: z.number().int().nonnegative().nullable().transform(v => v ?? 0),
    is_liked: z.boolean(),
    is_edited: z.boolean().default(false),
    parent_cuid: z.string().nullable().optional(),
    created_at: z.string().datetime({ offset: true }),
}).transform(raw => ({
    id: raw.cuid as unknown as Cuid,
    content: raw.content,
    author: raw.author,
    likesCount: raw.likes_count,
    isLiked: raw.is_liked,
    isEdited: raw.is_edited,
    replyCount: raw.replies_count,
    parentCuid: raw.parent_cuid !== null && raw.parent_cuid !== undefined
        ? raw.parent_cuid as unknown as Cuid
        : undefined,
    createdAt: raw.created_at,
}));

export const CommentListApiSchema = z.object({
    data: z.array(CommentApiSchema),
    meta: z.object({
        total: z.number().int().nonnegative(),
        current_page: z.number().int().positive(),
        per_page: z.number().int().positive(),
        last_page: z.number().int().positive(),
    }),
}).transform(raw => ({
    data: raw.data,
    meta: {
        total: raw.meta.total,
        page: raw.meta.current_page,
        perPage: raw.meta.per_page,
        lastPage: raw.meta.last_page,
    },
}));

export const CommentRepliesApiSchema = z.object({
    data: z.array(CommentApiSchema),
}).transform(raw => raw.data);

export const ToggleLikeApiSchema = z.object({
    liked: z.boolean(),
    likes_count: z.number().int().nonnegative(),
}).transform(raw => ({
    liked: raw.liked,
    likesCount: raw.likes_count,
}));

export const CommentVersionApiSchema = z.object({
    version: z.number().int().positive(),
    content: z.string(),
    created_at: z.string().datetime({ offset: true }),
}).transform(raw => ({
    version: raw.version,
    content: raw.content,
    createdAt: raw.created_at,
}));

export const CommentVersionsApiSchema = z.object({
    data: z.array(CommentVersionApiSchema),
}).transform(raw => raw.data);

export type CommentApiInput = z.input<typeof CommentApiSchema>;
export type CommentApiOutput = z.output<typeof CommentApiSchema>;

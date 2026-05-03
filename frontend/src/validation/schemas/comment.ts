import { z } from 'zod';
import type { Cuid } from '@models/comment';

const commentAuthorSchema = z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    avatar: z.string(),
});

export const CommentApiSchema = z.object({
    cuid: z.string().min(1),
    content: z.string(),
    author: commentAuthorSchema,
    likes_count: z.number().int().nonnegative(),
    replies_count: z.number().int().nonnegative(),
    is_liked: z.boolean(),
    parent_cuid: z.string().nullable().optional(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }).nullable().optional(),
}).transform(raw => ({
    id: raw.cuid as unknown as Cuid,
    content: raw.content,
    author: raw.author,
    likesCount: raw.likes_count,
    isLiked: raw.is_liked,
    replyCount: raw.replies_count,
    parentCuid: raw.parent_cuid !== null && raw.parent_cuid !== undefined
        ? raw.parent_cuid as unknown as Cuid
        : undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at ?? undefined,
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

export type CommentApiInput = z.input<typeof CommentApiSchema>;
export type CommentApiOutput = z.output<typeof CommentApiSchema>;

import { z } from 'zod';
import { VideoStatus, type VideoId } from '@models/video';
import type { ChannelId } from '@models/channel';
import type { Tag } from '@models/tag';

const VideoStatusSchema = z.nativeEnum(VideoStatus);

const VideoTagSchema = z.string().transform(t => t as Tag);

export const VideoApiSchema = z.object({
    vuid: z.string().min(1),
    title: z.string().min(1).max(255),
    description: z.string(),
    status: VideoStatusSchema,
    views: z.number().int().nonnegative().nullable().optional(),
    duration: z.number().nonnegative().nullable().optional(),
    video_url: z.string().min(1).nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    published_at: z.string().datetime({ offset: true }).nullable().optional(),
    scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
    tags: z.array(VideoTagSchema).default([]),
    channel: z.string(),
    channel_id: z.string().min(1),
}).transform(raw => {
    const createdAt = raw.created_at ?? raw.published_at ?? new Date().toISOString();
    return {
        id: raw.vuid as unknown as VideoId,
        title: raw.title,
        description: raw.description,
        status: raw.status,
        views: raw.views ?? 0,
        duration: raw.duration ?? undefined,
        videoUrl: raw.video_url ?? undefined,
        thumbnail: raw.thumbnail_url ?? `https://picsum.photos/seed/${raw.vuid}/320/180`,
        publishedAt: raw.published_at ?? createdAt,
        createdAt,
        scheduledAt: raw.scheduled_at ?? undefined,
        tags: raw.tags,
        channel: raw.channel,
        channelId: raw.channel_id as unknown as ChannelId,
    };
});

export const VideoListApiSchema = z.object({
    data: z.array(VideoApiSchema),
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

export type VideoApiInput = z.input<typeof VideoApiSchema>;
export type VideoApiOutput = z.output<typeof VideoApiSchema>;

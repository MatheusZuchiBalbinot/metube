import { z } from 'zod';

export const VideoUploadRequestSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(5000).optional().default(''),
    tags: z.array(z.string()).max(20).default([]),
    status: z.enum(['published', 'scheduled']),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
}).refine(data => {
    const isScheduled = data.status === 'scheduled';
    return !isScheduled || !!data.scheduledAt;
}, {
    message: 'scheduledAt is required when status is scheduled',
    path: ['scheduledAt'],
});

export const VideoUpdateRequestSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    tags: z.array(z.string()).max(20).optional(),
    status: z.enum(['published', 'scheduled']).optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
});

export const VideoProgressRequestSchema = z.object({
    percent: z.number().min(0).max(100),
});

export type VideoUploadRequest = z.infer<typeof VideoUploadRequestSchema>;
export type VideoUpdateRequest = z.infer<typeof VideoUpdateRequestSchema>;
export type VideoProgressRequest = z.infer<typeof VideoProgressRequestSchema>;

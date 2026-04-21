import { z } from 'zod';

export const PlaylistCreateRequestSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
});

export const PlaylistUpdateRequestSchema = z.object({
    name: z.string().min(1).max(255),
});

export const PlaylistAddVideoRequestSchema = z.object({
    vuid: z.string().min(1),
});

export const PlaylistReorderRequestSchema = z.object({
    vuids: z.array(z.string().min(1)).min(1),
});

export type PlaylistCreateRequest = z.infer<typeof PlaylistCreateRequestSchema>;
export type PlaylistUpdateRequest = z.infer<typeof PlaylistUpdateRequestSchema>;

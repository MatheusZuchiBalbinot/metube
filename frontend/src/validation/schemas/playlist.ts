import { z } from 'zod';
import type { PlaylistId } from '@models/playlist';
import type { VideoId } from '@models/video';

export const PlaylistApiSchema = z.object({
    puid: z.string().min(1),
    name: z.string().min(1).max(255),
    video_ids: z.array(z.string()).default([]),
    created_at: z.string().datetime({ offset: true }),
}).transform(raw => ({
    id: raw.puid as unknown as PlaylistId,
    name: raw.name,
    videoIds: raw.video_ids as VideoId[],
    createdAt: raw.created_at,
}));

export const PlaylistListApiSchema = z.array(PlaylistApiSchema);

export type PlaylistApiInput = z.input<typeof PlaylistApiSchema>;
export type PlaylistApiOutput = z.output<typeof PlaylistApiSchema>;

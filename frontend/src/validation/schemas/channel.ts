import { z } from 'zod';
import type { ChannelId } from '@models/channel';

export const ChannelApiSchema = z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    avatar: z.string().url().nullable().optional(),
    description: z.string().nullable().optional(),
    subscriber_count: z.number().int().nonnegative().optional(),
}).transform(raw => ({
    id: raw.uuid as unknown as ChannelId,
    name: raw.name,
    avatar: raw.avatar ?? undefined,
    description: raw.description ?? undefined,
    subscriberCount: raw.subscriber_count ?? 0,
}));

export type ChannelApiInput = z.input<typeof ChannelApiSchema>;
export type ChannelApiOutput = z.output<typeof ChannelApiSchema>;

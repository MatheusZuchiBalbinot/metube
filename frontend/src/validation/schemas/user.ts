import { z } from 'zod';
import type { UserId } from '@models/user';

export const UserApiSchema = z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    bio: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    email_verified_at: z.string().datetime({ offset: true }).nullable().optional(),
    created_at: z.string().datetime({ offset: true }),
}).transform(raw => ({
    id: raw.uuid as unknown as UserId,
    uuid: raw.uuid,
    name: raw.name,
    email: raw.email,
    bio: raw.bio ?? undefined,
    avatar: raw.avatar ?? undefined,
    emailVerifiedAt: raw.email_verified_at ?? undefined,
    createdAt: raw.created_at,
}));

export type UserApiInput = z.input<typeof UserApiSchema>;
export type UserApiOutput = z.output<typeof UserApiSchema>;

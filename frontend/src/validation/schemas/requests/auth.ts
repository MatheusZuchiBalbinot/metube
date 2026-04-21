import { z } from 'zod';
import { UserApiSchema } from '../user';

export const LoginResponseApiSchema = z.object({
    user: UserApiSchema,
});

export type LoginResponseApiOutput = z.output<typeof LoginResponseApiSchema>;

export const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const UpdateProfileRequestSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    bio: z.string().max(1000).optional(),
}).refine(data => data.name !== undefined || data.bio !== undefined, {
    message: 'At least one field must be provided',
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

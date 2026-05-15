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

export const SignupRequestSchema = z.object({
    name: z.string().min(2).max(60),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    password_confirmation: z.string(),
}).refine(data => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
});

export const ForgotPasswordRequestSchema = z.object({
    email: z.string().email(),
});

export const ResetPasswordRequestSchema = z.object({
    password: z.string().min(8).max(128),
    password_confirmation: z.string(),
}).refine(data => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

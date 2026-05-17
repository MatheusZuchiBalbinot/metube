import { z } from 'zod';

export const VideoTranscriptionApiSchema = z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    language: z.string().nullable(),
    content: z.string().nullable(),
});

export type VideoTranscriptionApiOutput = z.output<typeof VideoTranscriptionApiSchema>;

import { z } from 'zod';

const ChapterSchema = z.object({
    timestamp: z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/),
    title: z.string().min(1),
});

export const VideoSummaryApiSchema = z.object({
    key_points: z.array(z.string()),
    chapters: z.array(ChapterSchema),
    reading_mode: z.string(),
}).transform(raw => ({
    keyPoints: raw.key_points,
    chapters: raw.chapters,
    readingMode: raw.reading_mode,
}));

export type VideoSummaryApiInput = z.input<typeof VideoSummaryApiSchema>;
export type VideoSummaryApiOutput = z.output<typeof VideoSummaryApiSchema>;

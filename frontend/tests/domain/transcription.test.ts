import { describe, it, expect } from 'vitest';
import { domain } from '@domain';
import type { VideoTranscription } from '@api/videos';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTranscription(overrides: Partial<VideoTranscription> = {}): VideoTranscription {
    return {
        status: 'completed',
        language: 'en',
        content: 'Hello world',
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('domain.transcription.isProcessing', () => {
    it('returns true for pending status', () => {
        expect(domain.transcription.isProcessing(makeTranscription({ status: 'pending' }))).toBe(true);
    });

    it('returns true for processing status', () => {
        expect(domain.transcription.isProcessing(makeTranscription({ status: 'processing' }))).toBe(true);
    });

    it.each(['completed', 'failed'] as const)(
        'returns false for %s status',
        (status) => {
            expect(domain.transcription.isProcessing(makeTranscription({ status }))).toBe(false);
        },
    );
});

describe('domain.transcription.isCompleted', () => {
    it('returns true for completed status', () => {
        expect(domain.transcription.isCompleted(makeTranscription({ status: 'completed' }))).toBe(true);
    });

    it.each(['pending', 'processing', 'failed'] as const)(
        'returns false for %s status',
        (status) => {
            expect(domain.transcription.isCompleted(makeTranscription({ status }))).toBe(false);
        },
    );
});

describe('domain.transcription.isFailed', () => {
    it('returns true for failed status', () => {
        expect(domain.transcription.isFailed(makeTranscription({ status: 'failed' }))).toBe(true);
    });

    it.each(['pending', 'processing', 'completed'] as const)(
        'returns false for %s status',
        (status) => {
            expect(domain.transcription.isFailed(makeTranscription({ status }))).toBe(false);
        },
    );
});

describe('domain.transcription.hasContent', () => {
    it('returns true when content is a non-empty string', () => {
        expect(domain.transcription.hasContent(makeTranscription({ content: 'Hello world' }))).toBe(true);
    });

    it('returns false when content is null', () => {
        expect(domain.transcription.hasContent(makeTranscription({ content: null }))).toBe(false);
    });

    it('returns false when content is an empty string', () => {
        expect(domain.transcription.hasContent(makeTranscription({ content: '' }))).toBe(false);
    });

    it('returns false when content is only whitespace', () => {
        expect(domain.transcription.hasContent(makeTranscription({ content: '   ' }))).toBe(false);
    });
});

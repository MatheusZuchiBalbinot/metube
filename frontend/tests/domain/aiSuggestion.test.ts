import { describe, it, expect } from 'vitest';
import { domain } from '@domain';
import type { AiSuggestion } from '@api/videos';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSuggestion(status: AiSuggestion['status']): AiSuggestion {
    return {
        status,
        suggestedTitle: 'Title',
        suggestedDescription: 'Desc',
        suggestedTags: [],
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('domain.aiSuggestion.isPending', () => {
    it('returns true for pending status', () => {
        expect(domain.aiSuggestion.isPending(makeSuggestion('pending'))).toBe(true);
    });

    it.each(['accepted', 'dismissed'] as const)('returns false for %s status', (status) => {
        expect(domain.aiSuggestion.isPending(makeSuggestion(status))).toBe(false);
    });
});

describe('domain.aiSuggestion.isAccepted', () => {
    it('returns true for accepted status', () => {
        expect(domain.aiSuggestion.isAccepted(makeSuggestion('accepted'))).toBe(true);
    });

    it.each(['pending', 'dismissed'] as const)('returns false for %s status', (status) => {
        expect(domain.aiSuggestion.isAccepted(makeSuggestion(status))).toBe(false);
    });
});

describe('domain.aiSuggestion.isDismissed', () => {
    it('returns true for dismissed status', () => {
        expect(domain.aiSuggestion.isDismissed(makeSuggestion('dismissed'))).toBe(true);
    });

    it.each(['pending', 'accepted'] as const)('returns false for %s status', (status) => {
        expect(domain.aiSuggestion.isDismissed(makeSuggestion(status))).toBe(false);
    });
});

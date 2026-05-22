import { describe, it, expect, beforeEach } from 'vitest';

// ─── viewedVideos ─────────────────────────────────────────────────────────────
// The module uses a module-level Set, so we must reset it between tests by
// re-importing with a fresh module via the native ESM cache bypass approach.
// Because Vitest isolates modules per test file by default, the Set starts
// empty for this file, but we still guard against cross-test bleed.

describe('viewedVideos', () => {
    // Re-import so we always get the live Set reference.  Vitest re-uses the
    // same module instance within a single test file, which is what we want:
    // we can test accumulation across markViewed calls within a single `it`.
    let markViewed: (id: string) => void;
    let hasViewed: (id: string) => boolean;

    beforeEach(async () => {
        // Force a fresh module instance for each test so the internal Set resets.
        const mod = await import('@utils/viewedVideos?t=' + Date.now() as string);
        markViewed = mod.markViewed;
        hasViewed = mod.hasViewed;
    });

    it('returns false for a video that has not been viewed', () => {
        expect(hasViewed('v-abc')).toBe(false);
    });

    it('returns true after marking a video as viewed', () => {
        markViewed('v-abc');
        expect(hasViewed('v-abc')).toBe(true);
    });

    it('returns false for a different video id', () => {
        markViewed('v-abc');
        expect(hasViewed('v-xyz')).toBe(false);
    });

    it('handles marking the same video multiple times without error', () => {
        markViewed('v-dup');
        markViewed('v-dup');
        expect(hasViewed('v-dup')).toBe(true);
    });

    it('tracks multiple distinct video ids independently', () => {
        markViewed('v-1');
        markViewed('v-2');
        expect(hasViewed('v-1')).toBe(true);
        expect(hasViewed('v-2')).toBe(true);
        expect(hasViewed('v-3')).toBe(false);
    });
});

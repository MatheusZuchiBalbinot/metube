import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS } from '@utils/storageKeys';

// ─── STORAGE_KEYS ─────────────────────────────────────────────────────────────

describe('STORAGE_KEYS', () => {
    it('has the WATCH_HISTORY key', () => {
        expect(STORAGE_KEYS.WATCH_HISTORY).toBe('metube:watch-history');
    });

    it('has the LIKED_VIDEOS key', () => {
        expect(STORAGE_KEYS.LIKED_VIDEOS).toBe('metube:liked-videos');
    });

    it('has the DISLIKED_VIDEOS key', () => {
        expect(STORAGE_KEYS.DISLIKED_VIDEOS).toBe('metube:disliked-videos');
    });

    it('has the SAVED_VIDEOS key', () => {
        expect(STORAGE_KEYS.SAVED_VIDEOS).toBe('metube:saved-videos');
    });

    it('has the VIDEO_PROGRESS key', () => {
        expect(STORAGE_KEYS.VIDEO_PROGRESS).toBe('metube:video-progress');
    });

    it('has the AUTOPLAY key', () => {
        expect(STORAGE_KEYS.AUTOPLAY).toBe('metube:autoplay');
    });

    it('has the PINNED_VIDEO key', () => {
        expect(STORAGE_KEYS.PINNED_VIDEO).toBe('metube:pinned-video');
    });

    it('has the SHORTS_MUTED key', () => {
        expect(STORAGE_KEYS.SHORTS_MUTED).toBe('metube:shorts-muted');
    });

    it('has the SHORTS_VOLUME key', () => {
        expect(STORAGE_KEYS.SHORTS_VOLUME).toBe('metube:shorts-volume');
    });

    it('has the THEME_MODE key', () => {
        expect(STORAGE_KEYS.THEME_MODE).toBe('theme-mode');
    });

    it('has the THEME_COLOR key', () => {
        expect(STORAGE_KEYS.THEME_COLOR).toBe('theme-color');
    });

    it('has the LANGUAGE key', () => {
        expect(STORAGE_KEYS.LANGUAGE).toBe('lang');
    });

    it('has the RECENT_SEARCHES key', () => {
        expect(STORAGE_KEYS.RECENT_SEARCHES).toBe('metube:recent-searches');
    });

    it('has the SUBSCRIPTIONS key', () => {
        expect(STORAGE_KEYS.SUBSCRIPTIONS).toBe('metube:subscriptions');
    });

    it('has the PLAYLISTS key', () => {
        expect(STORAGE_KEYS.PLAYLISTS).toBe('metube:playlists');
    });

    it('all storage keys are unique strings', () => {
        const values = Object.values(STORAGE_KEYS);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
    });

    it('all storage keys are non-empty strings', () => {
        for (const value of Object.values(STORAGE_KEYS)) {
            expect(typeof value).toBe('string');
            expect(value.length).toBeGreaterThan(0);
        }
    });
});

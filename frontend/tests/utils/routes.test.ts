import { describe, it, expect } from 'vitest';
import { ROUTES, videoUrl } from '@utils/routes';

describe('ROUTES', () => {
    it('has a LOGIN route', () => {
        expect(ROUTES.LOGIN).toBe('/login');
    });

    it('has a SIGNUP route', () => {
        expect(ROUTES.SIGNUP).toBe('/signup');
    });

    it('has a FORGOT_PASSWORD route', () => {
        expect(ROUTES.FORGOT_PASSWORD).toBe('/forgot-password');
    });

    it('has a RESET_PASSWORD route with :token param', () => {
        expect(ROUTES.RESET_PASSWORD).toBe('/reset-password/:token');
    });

    it('has a HOME route', () => {
        expect(ROUTES.HOME).toBe('/');
    });

    it('has a RECOMMENDED route', () => {
        expect(ROUTES.RECOMMENDED).toBe('/recommended');
    });

    it('has a SUBSCRIPTIONS_FEED route', () => {
        expect(ROUTES.SUBSCRIPTIONS_FEED).toBe('/subscriptions');
    });

    it('has a SHORTS route', () => {
        expect(ROUTES.SHORTS).toBe('/shorts');
    });

    it('has a HISTORY route', () => {
        expect(ROUTES.HISTORY).toBe('/history');
    });

    it('has a PLAYLISTS route', () => {
        expect(ROUTES.PLAYLISTS).toBe('/playlists');
    });

    it('has a WATCH_LATER route', () => {
        expect(ROUTES.WATCH_LATER).toBe('/watch-later');
    });

    it('has a LIKED route', () => {
        expect(ROUTES.LIKED).toBe('/liked');
    });

    it('has a PROFILE route', () => {
        expect(ROUTES.PROFILE).toBe('/profile');
    });

    it('has a SETTINGS route', () => {
        expect(ROUTES.SETTINGS).toBe('/settings');
    });

    it('has a USER route with :id param', () => {
        expect(ROUTES.USER).toBe('/user/:id');
    });

    it('has a VIDEO route', () => {
        expect(ROUTES.VIDEO).toBe('/watch');
    });

    it('has a SEARCH route', () => {
        expect(ROUTES.SEARCH).toBe('/search');
    });

    it('has a CHANNEL route with :id param', () => {
        expect(ROUTES.CHANNEL).toBe('/channel/:id');
    });
});

describe('videoUrl', () => {
    it('returns the correct watch URL for a given vuid', () => {
        expect(videoUrl('abc123')).toBe('/watch?v=abc123');
    });

    it('produces unique urls for different vuids', () => {
        const url1 = videoUrl('v-one');
        const url2 = videoUrl('v-two');
        expect(url1).not.toBe(url2);
    });

    it('preserves the exact vuid string in the query param', () => {
        const vuid = 'xYz_0-9abc';
        expect(videoUrl(vuid)).toBe(`/watch?v=${vuid}`);
    });

    it('handles an empty vuid string', () => {
        expect(videoUrl('')).toBe('/watch?v=');
    });
});

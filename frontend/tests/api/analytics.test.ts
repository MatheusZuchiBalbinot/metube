// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analytics } from '@api/analytics';
import { apiClient } from '@api/client';

vi.mock('@api/client', () => ({
    apiClient: {
        post: vi.fn(),
    },
}));

const vuid = 'abc12345678' as Parameters<typeof analytics.skip>[0]['vuid'];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('AnalyticsApi', () => {
    describe('impressions', () => {
        it('posts to /analytics/impressions with snake_case keys', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await analytics.impressions({ vuids: [vuid], source: 'home', sessionId: 'sess-1' });
            expect(apiClient.post).toHaveBeenCalledWith('/analytics/impressions', {
                vuids: [vuid],
                source: 'home',
                session_id: 'sess-1',
            });
        });
    });

    describe('click', () => {
        it('posts to /analytics/clicks with snake_case keys', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await analytics.click({ vuid, source: 'search', position: 3, sessionId: 'sess-1' });
            expect(apiClient.post).toHaveBeenCalledWith('/analytics/clicks', {
                vuid,
                source: 'search',
                position: 3,
                session_id: 'sess-1',
            });
        });
    });

    describe('search', () => {
        it('posts to /analytics/searches with result_count', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await analytics.search({ query: 'react', resultCount: 10, sessionId: 'sess-1' });
            expect(apiClient.post).toHaveBeenCalledWith('/analytics/searches', {
                query: 'react',
                result_count: 10,
                session_id: 'sess-1',
            });
        });
    });

    describe('skip', () => {
        it('posts to /analytics/skips with vuid and percent', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await analytics.skip({ vuid, percent: 45 });
            expect(apiClient.post).toHaveBeenCalledWith('/analytics/skips', {
                vuid,
                percent: 45,
            });
        });
    });
});

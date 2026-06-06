// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { feed } from '@api/feed';
import { apiClient } from '@api/client';

vi.mock('@api/client', () => ({
    apiClient: {
        getValidated: vi.fn(),
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

/** Runs feed.list() with the real parser applied to a raw payload. */
function runParser(raw: unknown) {
    vi.mocked(apiClient.getValidated).mockImplementation(((_url: string, parser: (r: unknown) => unknown) => {
        const parsed = parser(raw);
        return Promise.resolve(parsed !== null ? { ok: true, data: parsed } : { ok: false, error: 'invalid' });
    }) as typeof apiClient.getValidated);

    return feed.list();
}

describe('FeedApi', () => {
    it('parses sections and their videos from the envelope', async () => {
        const raw = {
            data: [
                { key: 'trending', label: null, videos: [{ vuid: 'abc12345678', title: 'A', channel_id: 'ch1' }] },
                { key: 'because_you_watched', label: 'php', videos: [] },
            ],
        };

        const result = await runParser(raw);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data).toHaveLength(2);
            expect(result.data[0]).toMatchObject({ key: 'trending', label: null });
            expect(result.data[0].videos[0].id).toBe('abc12345678');
            expect(result.data[1]).toMatchObject({ key: 'because_you_watched', label: 'php' });
        }
    });

    it('drops sections without a key', async () => {
        const result = await runParser({ data: [{ label: 'x', videos: [] }] });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data).toHaveLength(0);
        }
    });

    it('returns invalid for a non-object payload', async () => {
        const result = await runParser(null);
        expect(result.ok).toBe(false);
    });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { interactions } from '@api/interactions';
import { apiClient } from '@api/client';
import * as parsers from '@api/parsers';

vi.mock('@api/client', () => ({
    apiClient: {
        getValidated: vi.fn(),
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('InteractionsApi', () => {
    describe('liked', () => {
        it('calls getValidated on /users/me/likes', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await interactions.liked();
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                '/users/me/likes',
                parsers.parseVideoList,
            );
        });
    });

    describe('saved', () => {
        it('calls getValidated on /users/me/saved', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await interactions.saved();
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                '/users/me/saved',
                parsers.parseVideoList,
            );
        });
    });
});

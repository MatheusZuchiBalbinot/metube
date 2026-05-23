// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { channel } from '@api/channels';
import { apiClient } from '@api/client';
import * as parsers from '@api/parsers';

vi.mock('@api/client', () => ({
    apiClient: {
        getValidated: vi.fn(),
        post: vi.fn(),
    },
}));

const uuid = 'chan-uuid-001' as Parameters<typeof channel.get>[0];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('ChannelApi', () => {
    describe('get', () => {
        it('calls getValidated on /channels/:uuid', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await channel.get(uuid);
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                `/channels/${uuid}`,
                parsers.parseUser,
            );
        });
    });

    describe('videos', () => {
        it('calls getValidated on /channels/:uuid/videos', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await channel.videos(uuid);
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                `/channels/${uuid}/videos`,
                parsers.parseVideoList,
            );
        });
    });

    describe('toggleSubscription', () => {
        it('posts to /channels/:uuid/subscription', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await channel.toggleSubscription(uuid);
            expect(apiClient.post).toHaveBeenCalledWith(`/channels/${uuid}/subscription`);
        });
    });

    describe('subscriptions', () => {
        it('calls getValidated on /users/me/subscriptions', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await channel.subscriptions();
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                '/users/me/subscriptions',
                parsers.parseUserArray,
            );
        });
    });
});

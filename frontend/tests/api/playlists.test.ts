// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playlist } from '@api/playlists';
import { apiClient } from '@api/client';
import * as parsers from '@api/parsers';

vi.mock('@api/client', () => ({
    apiClient: {
        getValidated: vi.fn(),
        postValidated: vi.fn(),
        patchValidated: vi.fn(),
        putValidated: vi.fn(),
        delete: vi.fn(),
    },
}));

const puid = 'pl-uid-00001' as Parameters<typeof playlist.update>[0];
const vuid = 'abc12345678' as Parameters<typeof playlist.addVideo>[1];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('PlaylistApi', () => {
    describe('list', () => {
        it('calls getValidated on /playlists', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await playlist.list();
            expect(apiClient.getValidated).toHaveBeenCalledWith('/playlists', parsers.parsePlaylistList);
        });
    });

    describe('create', () => {
        it('posts to /playlists with name', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await playlist.create('My Playlist');
            expect(apiClient.postValidated).toHaveBeenCalledWith(
                '/playlists',
                parsers.parsePlaylist,
                { name: 'My Playlist' },
            );
        });
    });

    describe('update', () => {
        it('patches /playlists/:puid with new name', async () => {
            vi.mocked(apiClient.patchValidated).mockResolvedValue(null);
            await playlist.update(puid, 'Renamed');
            expect(apiClient.patchValidated).toHaveBeenCalledWith(
                `/playlists/${puid}`,
                parsers.parsePlaylist,
                { name: 'Renamed' },
            );
        });
    });

    describe('delete', () => {
        it('deletes /playlists/:puid', async () => {
            vi.mocked(apiClient.delete).mockResolvedValue(null);
            await playlist.delete(puid);
            expect(apiClient.delete).toHaveBeenCalledWith(`/playlists/${puid}`);
        });
    });

    describe('addVideo', () => {
        it('posts vuid to /playlists/:puid/videos', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await playlist.addVideo(puid, vuid);
            expect(apiClient.postValidated).toHaveBeenCalledWith(
                `/playlists/${puid}/videos`,
                parsers.parsePlaylist,
                { vuid },
            );
        });
    });

    describe('removeVideo', () => {
        it('deletes /playlists/:puid/videos/:vuid', async () => {
            vi.mocked(apiClient.delete).mockResolvedValue(null);
            await playlist.removeVideo(puid, vuid);
            expect(apiClient.delete).toHaveBeenCalledWith(`/playlists/${puid}/videos/${vuid}`);
        });
    });

    describe('reorder', () => {
        it('puts ordered vuids to /playlists/:puid/videos', async () => {
            vi.mocked(apiClient.putValidated).mockResolvedValue(null);
            const vuids = [vuid];
            await playlist.reorder(puid, vuids);
            expect(apiClient.putValidated).toHaveBeenCalledWith(
                `/playlists/${puid}/videos`,
                parsers.parsePlaylist,
                { vuids },
            );
        });
    });
});

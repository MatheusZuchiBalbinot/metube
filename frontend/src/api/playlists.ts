import { apiClient } from './client';
import type { Vuid } from './videos';
import type { Playlist } from '@models/playlist';
export type { Playlist };
import { parsePlaylist, parsePlaylistList } from './parsers';

export type Puid = string & { readonly _brand: 'Puid' };

class PlaylistApi {
    private readonly baseUrl = '/playlists';

    async list(): Promise<Playlist[] | null> {
        return apiClient.getValidated(this.baseUrl, parsePlaylistList);
    }

    async create(name: string): Promise<Playlist | null> {
        return apiClient.postValidated(this.baseUrl, parsePlaylist, { name });
    }

    async update(puid: Puid, name: string): Promise<Playlist | null> {
        return apiClient.patchValidated(`${this.baseUrl}/${puid}`, parsePlaylist, { name });
    }

    async delete(puid: Puid): Promise<void> {
        await apiClient.delete(`${this.baseUrl}/${puid}`);
    }

    async addVideo(puid: Puid, vuid: Vuid): Promise<Playlist | null> {
        return apiClient.postValidated(`${this.baseUrl}/${puid}/videos`, parsePlaylist, { vuid });
    }

    async removeVideo(puid: Puid, vuid: Vuid): Promise<void> {
        await apiClient.delete(`${this.baseUrl}/${puid}/videos/${vuid}`);
    }

    async reorder(puid: Puid, vuids: Vuid[]): Promise<Playlist | null> {
        return apiClient.putValidated(`${this.baseUrl}/${puid}/videos`, parsePlaylist, { vuids });
    }
}

export const playlist = new PlaylistApi();

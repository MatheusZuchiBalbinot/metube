import { apiClient } from './client';
import type { ApiResult } from './client';
import type { Vuid } from './videos';
import type { Playlist } from '@models';
export type { Playlist };
import { parsePlaylist, parsePlaylistList } from './parsers';

export type Puid = string & { readonly _brand: 'Puid' };
export function toPuid(id: string): Puid {
    return id as unknown as Puid;
}

class PlaylistApi {
    private readonly baseUrl = '/playlists';

    async list(): Promise<ApiResult<Playlist[]>> {
        return apiClient.getValidated(this.baseUrl, parsePlaylistList);
    }

    async create(name: string): Promise<ApiResult<Playlist>> {
        return apiClient.postValidated(this.baseUrl, parsePlaylist, { name });
    }

    async update(puid: Puid, name: string): Promise<ApiResult<Playlist>> {
        return apiClient.patchValidated(`${this.baseUrl}/${puid}`, parsePlaylist, { name });
    }

    async delete(puid: Puid): Promise<ApiResult<void>> {
        return apiClient.delete(`${this.baseUrl}/${puid}`);
    }

    async addVideo(puid: Puid, vuid: Vuid): Promise<ApiResult<Playlist>> {
        return apiClient.postValidated(`${this.baseUrl}/${puid}/videos`, parsePlaylist, { vuid });
    }

    async removeVideo(puid: Puid, vuid: Vuid): Promise<ApiResult<void>> {
        return apiClient.delete(`${this.baseUrl}/${puid}/videos/${vuid}`);
    }

    async reorder(puid: Puid, vuids: Vuid[]): Promise<ApiResult<Playlist>> {
        return apiClient.putValidated(`${this.baseUrl}/${puid}/videos`, parsePlaylist, { vuids });
    }
}

export const playlist = new PlaylistApi();

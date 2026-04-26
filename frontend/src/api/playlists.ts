import { apiClient } from './client';
import type { Vuid } from './videos';
import type { Playlist } from '@models/playlist';
export type { Playlist };
import { PlaylistApiSchema, PlaylistListApiSchema } from '@validation';

export type Puid = string & { readonly _brand: 'Puid' };

class PlaylistApi {
    private readonly baseUrl = '/playlists';

    async list(): Promise<Playlist[] | null> {
        return apiClient.getValidated(this.baseUrl, PlaylistListApiSchema);
    }

    async create(name: string): Promise<Playlist | null> {
        return apiClient.postValidated(this.baseUrl, PlaylistApiSchema, { name });
    }

    async update(puid: Puid, name: string): Promise<Playlist | null> {
        return apiClient.patchValidated(`${this.baseUrl}/${puid}`, PlaylistApiSchema, { name });
    }

    async delete(puid: Puid): Promise<void> {
        await apiClient.delete(`${this.baseUrl}/${puid}`);
    }

    async addVideo(puid: Puid, vuid: Vuid): Promise<Playlist | null> {
        return apiClient.postValidated(`${this.baseUrl}/${puid}/videos`, PlaylistApiSchema, { vuid });
    }

    async removeVideo(puid: Puid, vuid: Vuid): Promise<void> {
        await apiClient.delete(`${this.baseUrl}/${puid}/videos/${vuid}`);
    }

    async reorder(puid: Puid, vuids: Vuid[]): Promise<Playlist | null> {
        return apiClient.putValidated(`${this.baseUrl}/${puid}/videos`, PlaylistApiSchema, { vuids });
    }
}

export const playlist = new PlaylistApi();

import { apiClient } from './client';
import { VideoListApiSchema } from '@validation';
import type { VideoListResponse } from './videos';

class InteractionsApi {
    private readonly baseUrl = '/users/me';

    async liked(): Promise<VideoListResponse | null> {
        return apiClient.getValidated(`${this.baseUrl}/likes`, VideoListApiSchema);
    }

    async saved(): Promise<VideoListResponse | null> {
        return apiClient.getValidated(`${this.baseUrl}/saved`, VideoListApiSchema);
    }
}

export const interactions = new InteractionsApi();

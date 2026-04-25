import { apiClient } from './client';
import { VideoListApiSchema } from '@validation';
import type { VideoListResponse } from './videos';

class InteractionsApi {
    private readonly userMeUrl = '/users/me';

    async liked(): Promise<VideoListResponse | null> {
        return apiClient.getValidated(`${this.userMeUrl}/likes`, VideoListApiSchema);
    }

    async saved(): Promise<VideoListResponse | null> {
        return apiClient.getValidated(`${this.userMeUrl}/saved`, VideoListApiSchema);
    }
}

export const interactions = new InteractionsApi();

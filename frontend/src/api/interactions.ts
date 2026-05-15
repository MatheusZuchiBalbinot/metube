import { apiClient } from './client';
import { VideoListApiSchema } from '@validation';
import type { VideoListResponse } from './videos';

class InteractionsApi {
    async liked(): Promise<VideoListResponse | null> {
        return apiClient.getValidated('/likes', VideoListApiSchema);
    }

    async saved(): Promise<VideoListResponse | null> {
        return apiClient.getValidated('/saved', VideoListApiSchema);
    }
}

export const interactions = new InteractionsApi();

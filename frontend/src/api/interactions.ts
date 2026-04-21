import { apiClient } from './client';
import type { Video } from '@models/video';

class InteractionsApi {
    private readonly userMeUrl = '/users/me';

    async liked(): Promise<Video[] | null> {
        return apiClient.get<Video[]>(`${this.userMeUrl}/likes`);
    }

    async saved(): Promise<Video[] | null> {
        return apiClient.get<Video[]>(`${this.userMeUrl}/saved`);
    }
}

export const interactions = new InteractionsApi();

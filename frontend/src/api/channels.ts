import { apiClient } from './client';
import type { User } from '@models/user';
import { UserApiSchema, VideoListApiSchema } from '@validation';
import { z } from 'zod';
import type { VideoListResponse } from './videos';

export type Uuid = string & { readonly _brand: 'Uuid' };

class ChannelApi {
    private readonly baseUrl = '/channels';

    async get(uuid: Uuid): Promise<User | null> {
        return apiClient.getValidated(`${this.baseUrl}/${uuid}`, UserApiSchema);
    }

    async videos(uuid: Uuid): Promise<VideoListResponse | null> {
        return apiClient.getValidated(`${this.baseUrl}/${uuid}/videos`, VideoListApiSchema);
    }

    async toggleSubscription(uuid: Uuid): Promise<void> {
        await apiClient.post(`${this.baseUrl}/${uuid}/subscription`);
    }

    async subscriptions(): Promise<User[] | null> {
        return apiClient.getValidated('/subscriptions', z.array(UserApiSchema));
    }
}

export const channel = new ChannelApi();

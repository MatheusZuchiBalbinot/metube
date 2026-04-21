import { apiClient } from './client';
import type { Video } from '@models/video';
import type { User } from '@models/user';
import { UserApiSchema } from '@validation';
import { z } from 'zod';

export type Uuid = string & { readonly _brand: 'Uuid' };

class ChannelApi {
    private readonly baseUrl = '/channels';
    private readonly userMeUrl = '/users/me';

    async get(uuid: Uuid): Promise<User | null> {
        return apiClient.getValidated(`${this.baseUrl}/${uuid}`, UserApiSchema);
    }

    async videos(uuid: Uuid): Promise<Video[] | null> {
        return apiClient.get<Video[]>(`${this.baseUrl}/${uuid}/videos`);
    }

    async toggleSubscription(uuid: Uuid): Promise<void> {
        await apiClient.post(`${this.baseUrl}/${uuid}/subscription`);
    }

    async subscriptions(): Promise<User[] | null> {
        return apiClient.getValidated(`${this.userMeUrl}/subscriptions`, z.array(UserApiSchema));
    }
}

export const channel = new ChannelApi();

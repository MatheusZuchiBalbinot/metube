import { apiClient } from './client';
import type { User } from '@models/user';
import { parseUser, parseUserArray, parseVideoList } from './parsers';
import type { VideoListResponse } from './videos';

export type Uuid = string & { readonly _brand: 'Uuid' };

class ChannelApi {
    private readonly baseUrl = '/channels';

    async get(uuid: Uuid): Promise<User | null> {
        return apiClient.getValidated(`${this.baseUrl}/${uuid}`, parseUser);
    }

    async videos(uuid: Uuid): Promise<VideoListResponse | null> {
        return apiClient.getValidated(`${this.baseUrl}/${uuid}/videos`, parseVideoList);
    }

    async toggleSubscription(uuid: Uuid): Promise<void> {
        await apiClient.post(`${this.baseUrl}/${uuid}/subscription`);
    }

    async subscriptions(): Promise<User[] | null> {
        return apiClient.getValidated('/users/me/subscriptions', parseUserArray);
    }
}

export const channel = new ChannelApi();

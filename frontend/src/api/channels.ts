import { apiClient } from './client';
import type { ApiResult } from './client';
import type { User } from '@models';
import { parseUser, parseUserArray, parseVideoList } from './parsers';
import type { VideoListResponse } from './videos';

export type Uuid = string & { readonly _brand: 'Uuid' };
export function toUuid(id: string): Uuid {
    return id as unknown as Uuid;
}

class ChannelApi {
    private readonly baseUrl = '/channels';

    async get(uuid: Uuid): Promise<ApiResult<User>> {
        return apiClient.getValidated(`${this.baseUrl}/${uuid}`, parseUser);
    }

    async videos(uuid: Uuid): Promise<ApiResult<VideoListResponse>> {
        return apiClient.getValidated(`${this.baseUrl}/${uuid}/videos`, parseVideoList);
    }

    async toggleSubscription(uuid: Uuid): Promise<boolean> {
        return apiClient.postEmpty(`${this.baseUrl}/${uuid}/subscription`);
    }

    async subscriptions(): Promise<ApiResult<User[]>> {
        return apiClient.getValidated('/users/me/subscriptions', parseUserArray);
    }
}

export const channel = new ChannelApi();

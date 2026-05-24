import { apiClient } from './client';
import type { ApiResult } from './client';
import { parseVideoList } from './parsers';
import type { VideoListResponse } from './videos';

class InteractionsApi {
    private readonly baseUrl = '/users/me';

    async liked(): Promise<ApiResult<VideoListResponse>> {
        return apiClient.getValidated(`${this.baseUrl}/likes`, parseVideoList);
    }

    async saved(): Promise<ApiResult<VideoListResponse>> {
        return apiClient.getValidated(`${this.baseUrl}/saved`, parseVideoList);
    }
}

export const interactions = new InteractionsApi();

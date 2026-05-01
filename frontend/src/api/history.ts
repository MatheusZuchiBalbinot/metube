import { apiClient } from './client';
import type { Video } from '@models/video';
import type { Vuid } from './videos';

export interface HistoryEvent {
    date: string
    count: number
}

class HistoryApi {
    private readonly baseUrl = '/users/me/history';
    private readonly userMeUrl = '/users/me';

    async list(): Promise<Video[] | null> {
        return apiClient.get<Video[]>(this.baseUrl);
    }

    async events(): Promise<HistoryEvent[] | null> {
        return apiClient.get<HistoryEvent[]>(`${this.baseUrl}/events`);
    }

    async remove(vuid: Vuid): Promise<void> {
        await apiClient.delete(`${this.baseUrl}/${vuid}`);
    }

    async clear(): Promise<void> {
        await apiClient.delete(this.baseUrl);
    }

    async progress(): Promise<Record<string, number> | null> {
        const result = await apiClient.get<{ data: Record<string, number> }>(`${this.userMeUrl}/progress`);
        return result?.data ?? null;
    }
}

export const history = new HistoryApi();

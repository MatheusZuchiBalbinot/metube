import { apiClient } from './client';
import type { Vuid } from './videos';

export const AnalyticsSource = {
    HOME: 'home',
    FEED: 'feed',
    SEARCH: 'search',
    CHANNEL: 'channel',
    PLAYLIST: 'playlist',
    RECOMMENDED: 'recommended',
} as const;
export type AnalyticsSource = typeof AnalyticsSource[keyof typeof AnalyticsSource];

export interface ImpressionsPayload {
    vuids: Vuid[]
    source: AnalyticsSource
    sessionId?: string
}

export interface ClickPayload {
    vuid: Vuid
    source: AnalyticsSource
    position?: number
    sessionId?: string
}

export interface SearchPayload {
    query: string
    resultCount: number
    sessionId?: string
}

export interface SkipPayload {
    vuid: Vuid
    percent: number
}

class AnalyticsApi {
    private readonly baseUrl = '/analytics';

    async impressions(payload: ImpressionsPayload): Promise<void> {
        await apiClient.post(`${this.baseUrl}/impressions`, {
            vuids: payload.vuids,
            source: payload.source,
            session_id: payload.sessionId,
        });
    }

    async click(payload: ClickPayload): Promise<void> {
        await apiClient.post(`${this.baseUrl}/clicks`, {
            vuid: payload.vuid,
            source: payload.source,
            position: payload.position,
            session_id: payload.sessionId,
        });
    }

    async search(payload: SearchPayload): Promise<void> {
        await apiClient.post(`${this.baseUrl}/searches`, {
            query: payload.query,
            result_count: payload.resultCount,
            session_id: payload.sessionId,
        });
    }

    async skip(payload: SkipPayload): Promise<void> {
        await apiClient.post(`${this.baseUrl}/skips`, {
            vuid: payload.vuid,
            percent: payload.percent,
        });
    }
}

export const analytics = new AnalyticsApi();

import { apiClient } from './client';
import type { ApiResult } from './client';
import type { Video } from '@models';
import { parseVideo } from './parsers';

export interface FeedSection {
    key: string
    label: string | null
    videos: Video[]
}

function parseFeedSection(item: unknown): FeedSection | null {
    const isSection = item !== null && typeof item === 'object';
    if (!isSection) {
        return null;
    }

    const obj = item as Record<string, unknown>;
    const key = typeof obj['key'] === 'string' ? obj['key'] : null;
    if (key === null) {
        return null;
    }

    const label = typeof obj['label'] === 'string' ? obj['label'] : null;
    const videos = Array.isArray(obj['videos'])
        ? obj['videos'].map(parseVideo).filter((v): v is Video => v !== null)
        : [];

    return { key, label, videos };
}

function parseFeed(raw: unknown): FeedSection[] | null {
    const isObject = raw !== null && typeof raw === 'object';
    if (!isObject) {
        return null;
    }

    const data = (raw as Record<string, unknown>)['data'];
    if (!Array.isArray(data)) {
        return null;
    }

    const sections: FeedSection[] = [];
    for (const item of data) {
        const section = parseFeedSection(item);
        if (section === null) {
            continue;
        }

        sections.push(section);
    }

    return sections;
}

class FeedApi {
    private readonly baseUrl = '/feed';

    async list(): Promise<ApiResult<FeedSection[]>> {
        return apiClient.getValidated(this.baseUrl, parseFeed);
    }
}

export const feed = new FeedApi();

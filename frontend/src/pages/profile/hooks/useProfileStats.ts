import { useMemo } from 'react';
import { domain } from '@domain';
import { countTagFrequency } from '@utils';
import type { Video, Tag } from '@models';

export interface ProfileStats {
    totalViews: number
    uploadsThisMonth: number
    subscriberCount: number
    publishedCount: number
    totalCount: number
    topTags: Tag[]
}

interface Params {
    isOwnProfile: boolean
    videos: Video[]
}

function isSameMonth(dateStr: string, now: Date): boolean {
    const date = new Date(dateStr);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function useProfileStats({ isOwnProfile, videos }: Params): ProfileStats | null {
    return useMemo(() => {
        if (!isOwnProfile) {
            return null;
        }

        const publishedVideos = videos.filter(v => domain.video.isVisible(v));
        const totalViews = publishedVideos.reduce((sum, v) => sum + v.views, 0);

        const now = new Date();
        const uploadsThisMonth = videos.filter(v => isSameMonth(v.createdAt, now)).length;

        const subscriberCount = videos.find(v => v.channelSubscribers !== undefined)?.channelSubscribers ?? 0;

        const topTags = [...countTagFrequency(publishedVideos).entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([videoTag]) => videoTag);

        return {
            totalViews, uploadsThisMonth, subscriberCount, topTags,
            publishedCount: publishedVideos.length,
            totalCount: videos.length,
        };
    }, [isOwnProfile, videos]);
}

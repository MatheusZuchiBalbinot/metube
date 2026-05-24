import { useMemo } from 'react';
import type { Video, VideoId, Tag } from '@models';

function formatWatchTime(seconds: number): string {
    const totalMinutes = Math.floor(seconds / 60);
    const isLessThanHour = totalMinutes < 60;

    if (isLessThanHour) {
        return `${totalMinutes}m`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

export interface ProfileStats {
    videosWatched: number
    watchTimeStr: string
    likedCount: number
    topTags: Tag[]
}

interface Params {
    isOwnProfile: boolean
    watchHistory: VideoId[]
    videoProgress: Record<VideoId, number>
    videos: Video[]
    likedVideos: Set<VideoId>
    watchedTagFrequency: Map<Tag, number>
}

export function useProfileStats({
    isOwnProfile,
    watchHistory,
    videoProgress,
    videos,
    likedVideos,
    watchedTagFrequency,
}: Params): ProfileStats | null {
    return useMemo(() => {
        if (!isOwnProfile) {
            return null;
        }

        const videosWatched = watchHistory.length;

        const totalWatchSeconds = watchHistory.reduce((sum: number, id: VideoId) => {
            const video = videos.find((v: Video) => v.id === id);
            const duration = video?.duration ?? 600;
            const progress = videoProgress[id] ?? 0;
            return sum + (progress / 100) * duration;
        }, 0);

        const watchTimeStr = formatWatchTime(totalWatchSeconds);

        const topTags = [...watchedTagFrequency.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag]) => tag);

        const likedCount = likedVideos.size;

        return { videosWatched, watchTimeStr, likedCount, topTags };
    }, [isOwnProfile, watchHistory, videoProgress, videos, likedVideos, watchedTagFrequency]);
}

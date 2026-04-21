import type { ChannelId } from './channel';
import type { Tag } from './tag';

export type VideoId = string & { readonly _brand: 'VideoId' };

export const VideoStatus = {
    PUBLISHED: 'published',
    SCHEDULED: 'scheduled',
    PROCESSING: 'processing',
    DRAFT: 'draft',
} as const;
export type VideoStatus = typeof VideoStatus[keyof typeof VideoStatus];

export interface Video {
    id: VideoId
    title: string
    description: string
    tags: Tag[]
    thumbnail: string
    publishedAt: string
    scheduledAt?: string
    channel: string
    channelId: ChannelId
    views: number
    status: VideoStatus
    duration?: number
    videoUrl?: string
}

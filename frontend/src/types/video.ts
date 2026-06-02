import type { ChannelId } from './channel';
import type { Tag } from './tag';
import type { Seconds, ViewCount } from './units';

export type VideoId = string & { readonly _brand: 'VideoId' };

export interface VideoCaption {
    lang: string
    label: string
    url: string
}

export const VideoStatus = {
    PUBLISHED: 'published',
    SCHEDULED: 'scheduled',
    PROCESSING: 'processing',
    DRAFT: 'draft',
    FAILED: 'failed',
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
    createdAt: string
    channel: string
    channelId: ChannelId
    channelSubscribers?: number
    views: ViewCount
    status: VideoStatus
    duration?: Seconds
    videoUrl?: string
    hlsUrl?: string
    captions?: VideoCaption[]
}

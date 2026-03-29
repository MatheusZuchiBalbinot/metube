import client from './client';
import type { Video, VideoId, VideoStatus } from '@models/video';
import type { ChannelId } from '@models/channel';
import type { Tag } from '@models/tag';
import type { PaginatedResponse } from '@models/common';

export type VideoListResponse = PaginatedResponse<Video>;

export interface VideoUploadPayload {
    title: string
    description: string
    tags: Tag[]
    channel: string
    channelId: ChannelId
    status: VideoStatus
    scheduledAt?: string
    thumbnail?: File
    videoFile?: File
}

export interface VideoUpdatePayload {
    title?: string
    description?: string
    tags?: Tag[]
    status?: VideoStatus
    scheduledAt?: string
}

export async function fetchVideos(params?: {
    page?: number
    perPage?: number
    search?: string
    tags?: Tag[]
    status?: VideoStatus
}): Promise<VideoListResponse> {
    const { data } = await client.get<VideoListResponse>('/videos', { params });
    return data;
}

export async function fetchVideo(id: VideoId): Promise<Video> {
    const { data } = await client.get<Video>(`/videos/${id}`);
    return data;
}

export async function uploadVideo(payload: VideoUploadPayload): Promise<Video> {
    const form = new FormData();
    form.append('title', payload.title);
    form.append('description', payload.description);
    form.append('channel', payload.channel);
    form.append('channelId', payload.channelId);
    form.append('status', payload.status);
    payload.tags.forEach(tag => form.append('tags[]', tag));
    if (payload.scheduledAt) { form.append('scheduledAt', payload.scheduledAt); }
    if (payload.thumbnail) { form.append('thumbnail', payload.thumbnail); }
    if (payload.videoFile) { form.append('videoFile', payload.videoFile); }

    const { data } = await client.post<Video>('/videos', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

export async function updateVideo(id: VideoId, payload: VideoUpdatePayload): Promise<Video> {
    const { data } = await client.patch<Video>(`/videos/${id}`, payload);
    return data;
}

export async function deleteVideo(id: VideoId): Promise<void> {
    await client.delete(`/videos/${id}`);
}

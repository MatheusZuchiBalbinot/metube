import client from './client';
import type { Video } from '@data/mockVideos';

export interface VideoListResponse {
    data: Video[]
    meta: {
        total: number
        page: number
        perPage: number
    }
}

export interface VideoUploadPayload {
    title: string
    description: string
    tags: string[]
    channel: string
    channelId: string
    status: string
    scheduledAt?: string
    thumbnail?: File
    videoFile?: File
}

export interface VideoUpdatePayload {
    title?: string
    description?: string
    tags?: string[]
    status?: string
    scheduledAt?: string
}

export async function fetchVideos(params?: {
    page?: number
    perPage?: number
    search?: string
    tags?: string[]
    status?: string
}): Promise<VideoListResponse> {
    const { data } = await client.get<VideoListResponse>('/videos', { params });
    return data;
}

export async function fetchVideo(id: string): Promise<Video> {
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

export async function updateVideo(id: string, payload: VideoUpdatePayload): Promise<Video> {
    const { data } = await client.patch<Video>(`/videos/${id}`, payload);
    return data;
}

export async function deleteVideo(id: string): Promise<void> {
    await client.delete(`/videos/${id}`);
}

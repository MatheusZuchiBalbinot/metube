import { apiClient } from './client';
import type { Video, VideoStatus } from '@models/video';
import type { Tag } from '@models/tag';
import { buildProgress, type ProgressCallback } from '@utils/upload';
import {
    parseVideo,
    parseVideoList,
    parseVideoSummary,
    parseVideoTranscription,
    type VideoSummary,
    type VideoTranscription,
    type VideoListApiResponse,
} from './parsers';

export type Vuid = string & { readonly _brand: 'Vuid' };
export type { VideoSummary, VideoTranscription };
export type VideoListResponse = VideoListApiResponse;
export type VideoChapter = VideoSummary['chapters'][number];

export interface VideoUploadPayload {
    title: string
    description: string
    tags: Tag[]
    status: VideoStatus
    scheduledAt?: string
    thumbnail?: File
    videoFile: File
}

export interface VideoFinalizePayload {
    uploadKey: string
    thumbnailKey?: string
    title: string
    description: string
    tags: Tag[]
    status: VideoStatus
    scheduledAt?: string
}

export interface VideoUpdatePayload {
    title?: string
    description?: string
    tags?: Tag[]
    status?: VideoStatus
    scheduledAt?: string
}

class VideoApi {
    private readonly baseUrl = '/videos';

    async list(params?: {
        page?: number
        perPage?: number
        search?: string
        tags?: Tag[]
        status?: VideoStatus
    }): Promise<VideoListResponse | null> {
        return apiClient.getValidated(this.baseUrl, parseVideoList, { params });
    }

    async get(vuid: Vuid): Promise<Video | null> {
        return apiClient.getValidated(`${this.baseUrl}/${vuid}`, parseVideo);
    }

    async create(payload: VideoUploadPayload, onProgress?: ProgressCallback): Promise<Video | null> {
        const form = new FormData();
        form.append('title', payload.title);
        form.append('description', payload.description);
        form.append('status', payload.status);
        payload.tags.forEach(tag => form.append('tags[]', tag));

        if (payload.scheduledAt) {
            form.append('scheduled_at', payload.scheduledAt);
        }

        if (payload.thumbnail) {
            form.append('thumbnail_file', payload.thumbnail);
        }

        if (payload.videoFile) {
            form.append('video_file', payload.videoFile);
        }

        const startTime = Date.now();

        return apiClient.postValidated(this.baseUrl, parseVideo, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress
                ? (event) => onProgress(buildProgress(event, startTime))
                : undefined,
        });
    }

    async finalize(payload: VideoFinalizePayload): Promise<Video | null> {
        return apiClient.postValidated(this.baseUrl, parseVideo, {
            upload_key: payload.uploadKey,
            thumbnail_key: payload.thumbnailKey,
            title: payload.title,
            description: payload.description,
            tags: payload.tags,
            status: payload.status,
            scheduled_at: payload.scheduledAt,
        });
    }

    async update(vuid: Vuid, payload: VideoUpdatePayload): Promise<Video | null> {
        return apiClient.patchValidated(`${this.baseUrl}/${vuid}`, parseVideo, payload);
    }

    async delete(vuid: Vuid): Promise<void> {
        await apiClient.delete(`${this.baseUrl}/${vuid}`);
    }

    async recordView(vuid: Vuid): Promise<void> {
        await apiClient.post(`${this.baseUrl}/${vuid}/views`);
    }

    async toggleLike(vuid: Vuid): Promise<void> {
        await apiClient.post(`${this.baseUrl}/${vuid}/like`);
    }

    async toggleDislike(vuid: Vuid): Promise<void> {
        await apiClient.post(`${this.baseUrl}/${vuid}/dislike`);
    }

    async toggleSave(vuid: Vuid): Promise<void> {
        await apiClient.post(`${this.baseUrl}/${vuid}/save`);
    }

    async updateProgress(vuid: Vuid, percent: number): Promise<void> {
        await apiClient.put(`${this.baseUrl}/${vuid}/progress`, { percent });
    }

    async getSummary(vuid: Vuid): Promise<VideoSummary | null> {
        return apiClient.getValidated(`${this.baseUrl}/${vuid}/summary`, parseVideoSummary);
    }

    async getTranscription(vuid: Vuid): Promise<VideoTranscription | null> {
        return apiClient.getValidated(`${this.baseUrl}/${vuid}/transcription`, parseVideoTranscription);
    }

    async retryTranscription(vuid: Vuid): Promise<boolean> {
        return apiClient.postEmpty(`${this.baseUrl}/${vuid}/transcription/retry`);
    }
}

export const video = new VideoApi();

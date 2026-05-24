import { apiClient } from './client';
import type { ApiResult } from './client';
import { buildProgress, type ProgressCallback } from '@utils';
import {
    parseVideo,
    parseVideoList,
    parseVideoSummary,
    parseVideoTranscription,
    parseAiSuggestion,
    type VideoSummary,
    type VideoTranscription,
    type AiSuggestion,
    type VideoListApiResponse,
    type KeyPoint,
} from './parsers';
import type { Video, VideoStatus, Tag } from '@models';

export type Vuid = string & { readonly _brand: 'Vuid' };
export function toVuid(id: string): Vuid {
    return id as unknown as Vuid;
}
export type { VideoSummary, VideoTranscription, AiSuggestion, KeyPoint };
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
    is_batch?: boolean
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
    }): Promise<ApiResult<VideoListResponse>> {
        return apiClient.getValidated(this.baseUrl, parseVideoList, { params });
    }

    async get(vuid: Vuid): Promise<ApiResult<Video>> {
        return apiClient.getValidated(`${this.baseUrl}/${vuid}`, parseVideo);
    }

    async create(payload: VideoUploadPayload, onProgress?: ProgressCallback): Promise<ApiResult<Video>> {
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

    async finalize(payload: VideoFinalizePayload): Promise<ApiResult<Video>> {
        return apiClient.postValidated(this.baseUrl, parseVideo, {
            upload_key: payload.uploadKey,
            thumbnail_key: payload.thumbnailKey,
            title: payload.title,
            description: payload.description,
            tags: payload.tags,
            status: payload.status,
            scheduled_at: payload.scheduledAt,
            is_batch: payload.is_batch ?? false,
        });
    }

    async update(vuid: Vuid, payload: VideoUpdatePayload): Promise<ApiResult<Video>> {
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

    async getSummary(vuid: Vuid): Promise<ApiResult<VideoSummary>> {
        return apiClient.getValidated(`${this.baseUrl}/${vuid}/summary`, parseVideoSummary);
    }

    async getTranscription(vuid: Vuid): Promise<ApiResult<VideoTranscription>> {
        return apiClient.getValidated(`${this.baseUrl}/${vuid}/transcription`, parseVideoTranscription);
    }

    async retryTranscription(vuid: Vuid): Promise<boolean> {
        return apiClient.postEmpty(`${this.baseUrl}/${vuid}/transcription/retry`);
    }

    async recommendations(page = 1): Promise<Video[]> {
        const result = await apiClient.getValidated('/recommendations', parseVideoList, {
            params: { page },
        });
        return result.ok ? result.data.data : [];
    }

    async getAiSuggestion(vuid: Vuid): Promise<ApiResult<AiSuggestion>> {
        return apiClient.getValidated(`${this.baseUrl}/${vuid}/ai-suggestion`, parseAiSuggestion);
    }

    async acceptAiSuggestion(vuid: Vuid): Promise<void> {
        await apiClient.post(`${this.baseUrl}/${vuid}/ai-suggestion/accept`);
    }

    async dismissAiSuggestion(vuid: Vuid): Promise<void> {
        await apiClient.post(`${this.baseUrl}/${vuid}/ai-suggestion/dismiss`);
    }
}

export const video = new VideoApi();

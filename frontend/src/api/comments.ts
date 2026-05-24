import { apiClient } from './client';
import type { ApiResult } from './client';
import type { Vuid } from './videos';
import type { Comment, CommentVersion } from '@models';
import {
    parseComment,
    parseCommentList,
    parseCommentReplies,
    parseToggleLike,
    parseCommentVersions,
    type CommentListApiResponse,
    type ToggleLikeApiResponse,
} from './parsers';

export type { Cuid } from '@models';


export type CommentListResponse = CommentListApiResponse;
export type ToggleLikeResponse = ToggleLikeApiResponse;

export interface StoreCommentPayload {
    content: string
    parentCuid?: string
}

class CommentsApi {
    private readonly baseUrl = '/videos';
    private readonly commentsUrl = '/comments';

    async list(vuid: Vuid, params?: { page?: number }): Promise<ApiResult<CommentListResponse>> {
        return apiClient.getValidated(
            `${this.baseUrl}/${vuid}/comments`,
            parseCommentList,
            { params },
        );
    }

    async create(vuid: Vuid, payload: StoreCommentPayload): Promise<ApiResult<Comment>> {
        const body: Record<string, unknown> = { content: payload.content };

        if (payload.parentCuid !== undefined) {
            body['parent_cuid'] = payload.parentCuid;
        }

        return apiClient.postValidated(
            `${this.baseUrl}/${vuid}/comments`,
            parseComment,
            body,
        );
    }

    async update(cuid: string, content: string): Promise<ApiResult<Comment>> {
        return apiClient.patchValidated(
            `${this.commentsUrl}/${cuid}`,
            parseComment,
            { content },
        );
    }

    async delete(cuid: string): Promise<void> {
        await apiClient.delete(`${this.commentsUrl}/${cuid}`);
    }

    async toggleLike(cuid: string): Promise<ApiResult<ToggleLikeResponse>> {
        return apiClient.postValidated(
            `${this.commentsUrl}/${cuid}/like`,
            parseToggleLike,
            {},
        );
    }

    async replies(cuid: string): Promise<ApiResult<Comment[]>> {
        return apiClient.getValidated(
            `${this.commentsUrl}/${cuid}/replies`,
            parseCommentReplies,
        );
    }

    async versions(cuid: string): Promise<ApiResult<CommentVersion[]>> {
        return apiClient.getValidated(
            `${this.commentsUrl}/${cuid}/versions`,
            parseCommentVersions,
        );
    }
}

export const comments = new CommentsApi();

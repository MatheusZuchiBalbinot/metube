import { apiClient } from './client';
import type { Comment } from '@models/comment';
import type { PaginatedResponse } from '@models/common';
import type { Vuid } from './videos';
import { CommentListApiSchema, CommentRepliesApiSchema, CommentApiSchema, ToggleLikeApiSchema, CommentVersionsApiSchema } from '@validation';
import type { CommentVersion } from '@models/comment';

export type { Cuid } from '@models/comment';

export type CommentListResponse = PaginatedResponse<Comment>;

export interface StoreCommentPayload {
    content: string
    parentCuid?: string
}

export interface ToggleLikeResponse {
    liked: boolean
    likesCount: number
}

class CommentsApi {
    private readonly baseUrl = '/videos';
    private readonly commentsUrl = '/comments';

    async list(vuid: Vuid, params?: { page?: number }): Promise<CommentListResponse | null> {
        return apiClient.getValidated(
            `${this.baseUrl}/${vuid}/comments`,
            CommentListApiSchema,
            { params },
        );
    }

    async create(vuid: Vuid, payload: StoreCommentPayload): Promise<Comment | null> {
        const body: Record<string, unknown> = { content: payload.content };

        if (payload.parentCuid !== undefined) {
            body['parent_cuid'] = payload.parentCuid;
        }

        return apiClient.postValidated(
            `${this.baseUrl}/${vuid}/comments`,
            CommentApiSchema,
            body,
        );
    }

    async update(cuid: string, content: string): Promise<Comment | null> {
        return apiClient.patchValidated(
            `${this.commentsUrl}/${cuid}`,
            CommentApiSchema,
            { content },
        );
    }

    async delete(cuid: string): Promise<void> {
        await apiClient.delete(`${this.commentsUrl}/${cuid}`);
    }

    async toggleLike(cuid: string): Promise<ToggleLikeResponse | null> {
        return apiClient.postValidated(
            `${this.commentsUrl}/${cuid}/like`,
            ToggleLikeApiSchema,
            {},
        );
    }

    async replies(cuid: string): Promise<Comment[] | null> {
        return apiClient.getValidated(
            `${this.commentsUrl}/${cuid}/replies`,
            CommentRepliesApiSchema,
        );
    }

    async versions(cuid: string): Promise<CommentVersion[] | null> {
        return apiClient.getValidated(
            `${this.commentsUrl}/${cuid}/versions`,
            CommentVersionsApiSchema,
        );
    }
}

export const comments = new CommentsApi();

import { apiClient } from './client';
import type { Comment } from '@models/comment';
import type { Vuid } from './videos';
import type { CommentVersion } from '@models/comment';
import {
    parseComment,
    parseCommentList,
    parseCommentReplies,
    parseToggleLike,
    parseCommentVersions,
    type CommentListApiResponse,
    type ToggleLikeApiResponse,
} from './parsers';

export type { Cuid } from '@models/comment';

export type CommentListResponse = CommentListApiResponse;
export type ToggleLikeResponse = ToggleLikeApiResponse;

export interface StoreCommentPayload {
    content: string
    parentCuid?: string
}

class CommentsApi {
    private readonly baseUrl = '/videos';
    private readonly commentsUrl = '/comments';

    async list(vuid: Vuid, params?: { page?: number }): Promise<CommentListResponse | null> {
        return apiClient.getValidated(
            `${this.baseUrl}/${vuid}/comments`,
            parseCommentList,
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
            parseComment,
            body,
        );
    }

    async update(cuid: string, content: string): Promise<Comment | null> {
        return apiClient.patchValidated(
            `${this.commentsUrl}/${cuid}`,
            parseComment,
            { content },
        );
    }

    async delete(cuid: string): Promise<void> {
        await apiClient.delete(`${this.commentsUrl}/${cuid}`);
    }

    async toggleLike(cuid: string): Promise<ToggleLikeResponse | null> {
        return apiClient.postValidated(
            `${this.commentsUrl}/${cuid}/like`,
            parseToggleLike,
            {},
        );
    }

    async replies(cuid: string): Promise<Comment[] | null> {
        return apiClient.getValidated(
            `${this.commentsUrl}/${cuid}/replies`,
            parseCommentReplies,
        );
    }

    async versions(cuid: string): Promise<CommentVersion[] | null> {
        return apiClient.getValidated(
            `${this.commentsUrl}/${cuid}/versions`,
            parseCommentVersions,
        );
    }
}

export const comments = new CommentsApi();

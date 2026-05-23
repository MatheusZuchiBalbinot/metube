// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { comments } from '@api/comments';
import { apiClient } from '@api/client';
import * as parsers from '@api/parsers';

vi.mock('@api/client', () => ({
    apiClient: {
        getValidated: vi.fn(),
        postValidated: vi.fn(),
        patchValidated: vi.fn(),
        delete: vi.fn(),
    },
}));

const vuid = 'abc12345678' as Parameters<typeof comments.list>[0];
const cuid = 'cmt-cuid-001';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('CommentsApi', () => {
    describe('list', () => {
        it('calls getValidated on /videos/:vuid/comments', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await comments.list(vuid, { page: 2 });
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                `/videos/${vuid}/comments`,
                parsers.parseCommentList,
                { params: { page: 2 } },
            );
        });
    });

    describe('create', () => {
        it('posts content without parentCuid when not provided', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await comments.create(vuid, { content: 'Hello' });
            expect(apiClient.postValidated).toHaveBeenCalledWith(
                `/videos/${vuid}/comments`,
                parsers.parseComment,
                { content: 'Hello' },
            );
        });

        it('includes parent_cuid when parentCuid is provided', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await comments.create(vuid, { content: 'Reply', parentCuid: 'parent-cuid' });
            expect(apiClient.postValidated).toHaveBeenCalledWith(
                `/videos/${vuid}/comments`,
                parsers.parseComment,
                { content: 'Reply', parent_cuid: 'parent-cuid' },
            );
        });
    });

    describe('update', () => {
        it('patches /comments/:cuid with new content', async () => {
            vi.mocked(apiClient.patchValidated).mockResolvedValue(null);
            await comments.update(cuid, 'Updated content');
            expect(apiClient.patchValidated).toHaveBeenCalledWith(
                `/comments/${cuid}`,
                parsers.parseComment,
                { content: 'Updated content' },
            );
        });
    });

    describe('delete', () => {
        it('deletes /comments/:cuid', async () => {
            vi.mocked(apiClient.delete).mockResolvedValue(null);
            await comments.delete(cuid);
            expect(apiClient.delete).toHaveBeenCalledWith(`/comments/${cuid}`);
        });
    });

    describe('toggleLike', () => {
        it('posts to /comments/:cuid/like', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await comments.toggleLike(cuid);
            expect(apiClient.postValidated).toHaveBeenCalledWith(
                `/comments/${cuid}/like`,
                parsers.parseToggleLike,
                {},
            );
        });
    });

    describe('replies', () => {
        it('calls getValidated on /comments/:cuid/replies', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await comments.replies(cuid);
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                `/comments/${cuid}/replies`,
                parsers.parseCommentReplies,
            );
        });
    });

    describe('versions', () => {
        it('calls getValidated on /comments/:cuid/versions', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await comments.versions(cuid);
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                `/comments/${cuid}/versions`,
                parsers.parseCommentVersions,
            );
        });
    });
});

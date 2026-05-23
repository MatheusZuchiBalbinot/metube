// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { video } from '@api/videos';
import { apiClient } from '@api/client';
import * as parsers from '@api/parsers';

vi.mock('@api/client', () => ({
    apiClient: {
        getValidated: vi.fn(),
        postValidated: vi.fn(),
        patchValidated: vi.fn(),
        putValidated: vi.fn(),
        postEmpty: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        get: vi.fn(),
    },
}));

const v = 'abc12345678' as Parameters<typeof video.get>[0];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('VideoApi', () => {
    describe('list', () => {
        it('calls getValidated on /videos', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await video.list({ page: 2, search: 'react' });
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                '/videos',
                parsers.parseVideoList,
                { params: { page: 2, search: 'react' } },
            );
        });

        it('returns null when apiClient returns null', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            const result = await video.list();
            expect(result).toBeNull();
        });
    });

    describe('get', () => {
        it('calls getValidated with correct url', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await video.get(v);
            expect(apiClient.getValidated).toHaveBeenCalledWith(`/videos/${v}`, parsers.parseVideo);
        });
    });

    describe('update', () => {
        it('calls patchValidated with correct url and payload', async () => {
            vi.mocked(apiClient.patchValidated).mockResolvedValue(null);
            await video.update(v, { title: 'New Title' });
            expect(apiClient.patchValidated).toHaveBeenCalledWith(
                `/videos/${v}`,
                parsers.parseVideo,
                { title: 'New Title' },
            );
        });
    });

    describe('delete', () => {
        it('calls delete with correct url', async () => {
            vi.mocked(apiClient.delete).mockResolvedValue(null);
            await video.delete(v);
            expect(apiClient.delete).toHaveBeenCalledWith(`/videos/${v}`);
        });
    });

    describe('recordView', () => {
        it('calls post with correct url', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await video.recordView(v);
            expect(apiClient.post).toHaveBeenCalledWith(`/videos/${v}/views`);
        });
    });

    describe('toggleLike', () => {
        it('calls post with like url', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await video.toggleLike(v);
            expect(apiClient.post).toHaveBeenCalledWith(`/videos/${v}/like`);
        });
    });

    describe('toggleDislike', () => {
        it('calls post with dislike url', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await video.toggleDislike(v);
            expect(apiClient.post).toHaveBeenCalledWith(`/videos/${v}/dislike`);
        });
    });

    describe('toggleSave', () => {
        it('calls post with save url', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await video.toggleSave(v);
            expect(apiClient.post).toHaveBeenCalledWith(`/videos/${v}/save`);
        });
    });

    describe('updateProgress', () => {
        it('calls put with percent', async () => {
            vi.mocked(apiClient.put).mockResolvedValue(null);
            await video.updateProgress(v, 42);
            expect(apiClient.put).toHaveBeenCalledWith(`/videos/${v}/progress`, { percent: 42 });
        });
    });

    describe('getSummary', () => {
        it('calls getValidated with summary url', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await video.getSummary(v);
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                `/videos/${v}/summary`,
                parsers.parseVideoSummary,
            );
        });
    });

    describe('getTranscription', () => {
        it('calls getValidated with transcription url', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await video.getTranscription(v);
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                `/videos/${v}/transcription`,
                parsers.parseVideoTranscription,
            );
        });
    });

    describe('recommendations', () => {
        it('calls getValidated on /recommendations with page param', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await video.recommendations(3);
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                '/recommendations',
                parsers.parseVideoList,
                { params: { page: 3 } },
            );
        });

        it('defaults to page 1', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await video.recommendations();
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                '/recommendations',
                parsers.parseVideoList,
                { params: { page: 1 } },
            );
        });

        it('returns empty array when response is null', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            const result = await video.recommendations();
            expect(result).toEqual([]);
        });
    });

    describe('getAiSuggestion', () => {
        it('calls getValidated with ai-suggestion url', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await video.getAiSuggestion(v);
            expect(apiClient.getValidated).toHaveBeenCalledWith(
                `/videos/${v}/ai-suggestion`,
                parsers.parseAiSuggestion,
            );
        });
    });

    describe('acceptAiSuggestion', () => {
        it('calls post on accept url', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await video.acceptAiSuggestion(v);
            expect(apiClient.post).toHaveBeenCalledWith(`/videos/${v}/ai-suggestion/accept`);
        });
    });

    describe('dismissAiSuggestion', () => {
        it('calls post on dismiss url', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await video.dismissAiSuggestion(v);
            expect(apiClient.post).toHaveBeenCalledWith(`/videos/${v}/ai-suggestion/dismiss`);
        });
    });

    describe('create', () => {
        it('calls postValidated with FormData and multipart header', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await video.create({
                title: 'My Video',
                description: 'Desc',
                tags: [],
                status: 'draft' as never,
                videoFile: new File([''], 'video.mp4'),
            });
            expect(apiClient.postValidated).toHaveBeenCalledWith(
                '/videos',
                parsers.parseVideo,
                expect.any(FormData),
                expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
            );
        });

        it('appends scheduled_at when provided', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await video.create({
                title: 'My Video',
                description: '',
                tags: [],
                status: 'scheduled' as never,
                videoFile: new File([''], 'video.mp4'),
                scheduledAt: '2025-12-01T00:00:00Z',
            });
            const formData = vi.mocked(apiClient.postValidated).mock.calls[0][2] as FormData;
            expect(formData.get('scheduled_at')).toBe('2025-12-01T00:00:00Z');
        });
    });

    describe('retryTranscription', () => {
        it('calls postEmpty on transcription/retry url', async () => {
            vi.mocked(apiClient.postEmpty).mockResolvedValue(true);
            await video.retryTranscription(v);
            expect(apiClient.postEmpty).toHaveBeenCalledWith(`/videos/${v}/transcription/retry`);
        });
    });

    describe('finalize', () => {
        it('calls postValidated with snake_case keys', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await video.finalize({
                uploadKey: 'key-123',
                title: 'Title',
                description: 'Desc',
                tags: [],
                status: 'published' as never,
            });
            expect(apiClient.postValidated).toHaveBeenCalledWith(
                '/videos',
                parsers.parseVideo,
                expect.objectContaining({ upload_key: 'key-123', is_batch: false }),
            );
        });
    });
});

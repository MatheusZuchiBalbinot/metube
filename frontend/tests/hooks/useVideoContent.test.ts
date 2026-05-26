// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVideoContent } from '@hooks/useVideoContent';
import { VideoStatus } from '@models/video';

vi.mock('@api/videos', () => ({
    video: {
        getSummary: vi.fn(),
        getTranscription: vi.fn(),
    },
    toVuid: (id: string) => id,
}));

const echoMocks = vi.hoisted(() => {
    const channel = { listen: vi.fn() };
    const echo = {
        channel: vi.fn().mockReturnValue(channel),
        leaveChannel: vi.fn(),
    };
    return { channel, echo };
});

vi.mock('@lib/echo', () => ({
    getEcho: vi.fn().mockResolvedValue(null),
}));

import { video as videoApi } from '@api/videos';
import { getEcho } from '@lib/echo';

const mockSummary = {
    keyPoints: ['Point 1'],
    chapters: [],
    readingMode: 'bullets' as const,
};

const mockTranscription = {
    status: 'completed' as const,
    language: 'pt',
    content: 'Hello world',
};

describe('useVideoContent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null when id is undefined', () => {
        vi.mocked(videoApi.getSummary).mockResolvedValue({ ok: true, data: mockSummary });
        vi.mocked(videoApi.getTranscription).mockResolvedValue({ ok: true, data: mockTranscription });

        const { result } = renderHook(() => useVideoContent(undefined, VideoStatus.PUBLISHED));

        expect(result.current.summary).toBeNull();
        expect(result.current.transcription).toBeNull();
        expect(videoApi.getSummary).not.toHaveBeenCalled();
    });

    it('fetches summary and transcription for PUBLISHED video', async () => {
        vi.mocked(videoApi.getSummary).mockResolvedValue({ ok: true, data: mockSummary });
        vi.mocked(videoApi.getTranscription).mockResolvedValue({ ok: true, data: mockTranscription });

        const { result } = renderHook(() => useVideoContent('vAABB', VideoStatus.PUBLISHED));

        await waitFor(() => {
            expect(result.current.summary).not.toBeNull();
            expect(result.current.transcription).not.toBeNull();
        });

        expect(result.current.summary?.keyPoints).toEqual(['Point 1']);
        expect(result.current.transcription?.content).toBe('Hello world');
    });

    it('fetches for SCHEDULED videos too', async () => {
        vi.mocked(videoApi.getSummary).mockResolvedValue({ ok: true, data: mockSummary });
        vi.mocked(videoApi.getTranscription).mockResolvedValue({ ok: true, data: mockTranscription });

        const { result } = renderHook(() => useVideoContent('vSCHED', VideoStatus.SCHEDULED));

        await waitFor(() => {
            expect(result.current.summary).not.toBeNull();
        });
    });

    it('clears content when video is in PROCESSING state', async () => {
        vi.mocked(videoApi.getSummary).mockResolvedValue({ ok: true, data: mockSummary });
        vi.mocked(videoApi.getTranscription).mockResolvedValue({ ok: true, data: mockTranscription });

        const { result } = renderHook(() => useVideoContent('vPROC', VideoStatus.PROCESSING));

        expect(result.current.summary).toBeNull();
        expect(result.current.transcription).toBeNull();
        expect(videoApi.getSummary).not.toHaveBeenCalled();
    });

    it('sets summary to null when API fails', async () => {
        vi.mocked(videoApi.getSummary).mockResolvedValue({ ok: false, error: 'not found' });
        vi.mocked(videoApi.getTranscription).mockResolvedValue({ ok: false, error: 'not found' });

        const { result } = renderHook(() => useVideoContent('vFAIL', VideoStatus.PUBLISHED));

        await waitFor(() => {
            expect(videoApi.getSummary).toHaveBeenCalled();
        });

        expect(result.current.summary).toBeNull();
        expect(result.current.transcription).toBeNull();
    });

    it('refetches the transcription when echo emits .TranscriptionStatusUpdated', async () => {
        vi.mocked(getEcho).mockResolvedValue(echoMocks.echo as unknown as Awaited<ReturnType<typeof getEcho>>);
        vi.mocked(videoApi.getSummary).mockResolvedValue({ ok: true, data: mockSummary });
        vi.mocked(videoApi.getTranscription)
            .mockResolvedValueOnce({ ok: true, data: { ...mockTranscription, content: 'old' } })
            .mockResolvedValueOnce({ ok: true, data: { ...mockTranscription, content: 'new' } });

        const { result } = renderHook(() => useVideoContent('vECHO', VideoStatus.PUBLISHED));

        await waitFor(() => {
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.TranscriptionStatusUpdated', expect.any(Function));
        });

        const handler = echoMocks.channel.listen.mock.calls[0][1] as () => void;
        handler();

        await waitFor(() => {
            expect(result.current.transcription?.content).toBe('new');
        });
    });

    it('leaves the channel on unmount', async () => {
        vi.mocked(getEcho).mockResolvedValue(echoMocks.echo as unknown as Awaited<ReturnType<typeof getEcho>>);

        const { unmount } = renderHook(() => useVideoContent('vLEAVE', VideoStatus.PUBLISHED));

        await waitFor(() => {
            expect(echoMocks.echo.channel).toHaveBeenCalledWith('videos.vLEAVE');
        });

        unmount();

        await waitFor(() => {
            expect(echoMocks.echo.leaveChannel).toHaveBeenCalledWith('videos.vLEAVE');
        });
    });
});

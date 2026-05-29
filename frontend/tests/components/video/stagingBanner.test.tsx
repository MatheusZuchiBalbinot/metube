// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StagingBanner from '@components/video/stagingBanner';
import { video as videoApi } from '@api/videos';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import type { Video, VideoId } from '@models/video';
import { VideoStatus } from '@models/video';
import type { ChannelId } from '@models/channel';

vi.mock('@api/videos', () => ({
    video: {
        publish: vi.fn(),
    },
    toVuid: (id: string) => id,
}));

const mockDraftVideo: Video = {
    id: 'draft-video-1' as VideoId,
    title: 'My Draft Video',
    description: 'Not yet published',
    status: VideoStatus.DRAFT,
    views: 0,
    duration: 300,
    videoUrl: 'https://example.com/video.mp4',
    thumbnail: null,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    tags: [],
    captions: [],
    channel: 'Test Channel',
    channelId: 'channel-1' as ChannelId,
};

const mockPublishedVideo: Video = {
    ...mockDraftVideo,
    id: 'published-video-1' as VideoId,
    status: VideoStatus.PUBLISHED,
    publishedAt: new Date().toISOString(),
};

describe('StagingBanner', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the draft label', () => {
        renderWithProviders(<StagingBanner video={mockDraftVideo} />);

        expect(screen.getByText(/draft/i)).toBeInTheDocument();
    });

    it('renders the publish button', () => {
        renderWithProviders(<StagingBanner video={mockDraftVideo} />);

        expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    });

    it('calls video.publish on click and shows published toast on success', async () => {
        const user = userEvent.setup();
        vi.mocked(videoApi.publish).mockResolvedValue({ ok: true, data: mockPublishedVideo });

        const { store } = renderWithProviders(<StagingBanner video={mockDraftVideo} />);

        await user.click(screen.getByRole('button', { name: /publish/i }));

        await waitFor(() => {
            expect(videoApi.publish).toHaveBeenCalledWith(mockDraftVideo.id);
        });

        const toasts = store.getState().toast.toasts;
        expect(toasts.some(t => t.message.toLowerCase().includes('published'))).toBe(true);
    });

    it('shows error toast when publish fails', async () => {
        const user = userEvent.setup();
        vi.mocked(videoApi.publish).mockResolvedValue({ ok: false, error: 'Server error' });

        const { store } = renderWithProviders(<StagingBanner video={mockDraftVideo} />);

        await user.click(screen.getByRole('button', { name: /publish/i }));

        await waitFor(() => {
            expect(videoApi.publish).toHaveBeenCalled();
        });

        const toasts = store.getState().toast.toasts;
        expect(toasts.some(t => t.message === 'Server error')).toBe(true);
    });

    it('disables the button while publishing', async () => {
        const user = userEvent.setup();
        let resolvePublish!: (v: ReturnType<typeof videoApi.publish>) => void;
        vi.mocked(videoApi.publish).mockImplementation(
            () => new Promise(resolve => { resolvePublish = resolve; }),
        );

        renderWithProviders(<StagingBanner video={mockDraftVideo} />);

        await user.click(screen.getByRole('button', { name: /publish/i }));

        expect(screen.getByRole('button', { name: /publishing/i })).toBeDisabled();

        resolvePublish({ ok: true, data: mockPublishedVideo });
    });
});

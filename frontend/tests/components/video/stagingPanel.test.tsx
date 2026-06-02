// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StagingPanel from '@components/video/stagingPanel';
import type { toVuid } from '@api/videos';
import { video as videoApi } from '@api/videos';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeRootState, makeUser } from '../../helpers/factories';
import type { Video, VideoId } from '@models/video';
import { VideoStatus } from '@models/video';
import type { ChannelId } from '@models/channel';
import type { VideoSummary } from '@api';

vi.mock('@lib/echo', () => ({
    getEcho: vi.fn().mockResolvedValue(null),
}));

vi.mock('@api/videos', () => ({
    video: {
        publish: vi.fn(),
        getAiSuggestion: vi.fn(),
        acceptAiSuggestion: vi.fn(),
        dismissAiSuggestion: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
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

const mockSuggestion = {
    status: 'pending' as const,
    suggestedTitle: 'Better Title',
    suggestedDescription: 'Better Description',
    suggestedTags: ['tag1', 'tag2'],
};

const authState = makeRootState({
    auth: { user: makeUser({ uuid: 'test-uuid' as ReturnType<typeof toVuid> }), loading: false, sessionError: null },
});

function renderPanel(summary: VideoSummary | null = null) {
    return renderWithProviders(
        <StagingPanel video={mockDraftVideo} summary={summary} />,
        { preloadedState: authState },
    );
}

describe('StagingPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(videoApi.getAiSuggestion).mockResolvedValue({ ok: false, error: 'No suggestion' });
    });

    describe('banner', () => {
        it('renders the draft label', () => {
            renderPanel();
            expect(screen.getByText(/draft/i)).toBeInTheDocument();
        });

        it('renders the publish button', () => {
            renderPanel();
            expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
        });

        it('calls video.publish and shows success toast', async () => {
            const user = userEvent.setup();
            vi.mocked(videoApi.publish).mockResolvedValue({ ok: true, data: mockPublishedVideo });

            const { store } = renderPanel();
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

            const { store } = renderPanel();
            await user.click(screen.getByRole('button', { name: /publish/i }));

            await waitFor(() => expect(videoApi.publish).toHaveBeenCalled());

            const toasts = store.getState().toast.toasts;
            expect(toasts.some(t => t.message === 'Server error')).toBe(true);
        });

        it('disables publish button while publishing', async () => {
            const user = userEvent.setup();
            let resolve!: (v: ReturnType<typeof videoApi.publish>) => void;
            vi.mocked(videoApi.publish).mockImplementation(
                () => new Promise(r => {
                    resolve = r;
                }),
            );

            renderPanel();
            await user.click(screen.getByRole('button', { name: /publish/i }));
            expect(screen.getByRole('button', { name: /publishing/i })).toBeDisabled();

            resolve({ ok: true, data: mockPublishedVideo });
        });

        it('shows AI suggestions button when suggestion is pending', async () => {
            vi.mocked(videoApi.getAiSuggestion).mockResolvedValue({ ok: true, data: mockSuggestion });

            renderPanel();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /ai suggestion/i })).toBeInTheDocument();
            });
        });

        it('does not show AI suggestions button when no suggestion', async () => {
            vi.mocked(videoApi.getAiSuggestion).mockResolvedValue({ ok: false, error: 'None' });

            renderPanel();

            await waitFor(() => {
                expect(screen.queryByRole('button', { name: /ai suggestion/i })).not.toBeInTheDocument();
            });
        });
    });

    describe('suggestions modal', () => {
        it('opens modal with pre-filled fields when clicking AI suggestions button', async () => {
            const user = userEvent.setup();
            vi.mocked(videoApi.getAiSuggestion).mockResolvedValue({ ok: true, data: mockSuggestion });

            renderPanel();

            await waitFor(() => screen.getByRole('button', { name: /ai suggestion/i }));
            await user.click(screen.getByRole('button', { name: /ai suggestion/i }));

            expect(screen.getByDisplayValue(mockSuggestion.suggestedTitle)).toBeInTheDocument();
            expect(screen.getByDisplayValue(mockSuggestion.suggestedDescription)).toBeInTheDocument();
        });

        it('allows editing the title before applying', async () => {
            const user = userEvent.setup();
            vi.mocked(videoApi.getAiSuggestion).mockResolvedValue({ ok: true, data: mockSuggestion });
            vi.mocked(videoApi.update).mockResolvedValue({ ok: true, data: mockDraftVideo });
            vi.mocked(videoApi.acceptAiSuggestion).mockResolvedValue(undefined);

            renderPanel();

            await waitFor(() => screen.getByRole('button', { name: /ai suggestion/i }));
            await user.click(screen.getByRole('button', { name: /ai suggestion/i }));

            const titleInput = screen.getByDisplayValue(mockSuggestion.suggestedTitle);
            await user.clear(titleInput);
            await user.type(titleInput, 'My Custom Title');

            await user.click(screen.getByRole('button', { name: /accept/i }));

            await waitFor(() => {
                expect(videoApi.update).toHaveBeenCalledWith(
                    mockDraftVideo.id,
                    expect.objectContaining({ title: 'My Custom Title' }),
                );
            });
        });

        it('calls dismissAiSuggestion and closes modal when dismissing', async () => {
            const user = userEvent.setup();
            vi.mocked(videoApi.getAiSuggestion).mockResolvedValue({ ok: true, data: mockSuggestion });
            vi.mocked(videoApi.dismissAiSuggestion).mockResolvedValue(undefined);

            renderPanel();

            await waitFor(() => screen.getByRole('button', { name: /ai suggestion/i }));
            await user.click(screen.getByRole('button', { name: /ai suggestion/i }));
            await user.click(screen.getByRole('button', { name: /dismiss/i }));

            await waitFor(() => {
                expect(videoApi.dismissAiSuggestion).toHaveBeenCalledWith(mockDraftVideo.id);
            });
        });

        it('shows key points from summary in the modal', async () => {
            const user = userEvent.setup();
            vi.mocked(videoApi.getAiSuggestion).mockResolvedValue({ ok: true, data: mockSuggestion });

            const summary: VideoSummary = {
                keyPoints: ['Point one', 'Point two'] as VideoSummary['keyPoints'],
                chapters: [],
                readingMode: '',
            };

            renderPanel(summary);

            await waitFor(() => screen.getByRole('button', { name: /ai suggestion/i }));
            await user.click(screen.getByRole('button', { name: /ai suggestion/i }));

            expect(screen.getByText('Point one')).toBeInTheDocument();
            expect(screen.getByText('Point two')).toBeInTheDocument();
        });
    });
});

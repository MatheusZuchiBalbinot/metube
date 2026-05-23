import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiSuggestions from '@components/video/aiSuggestions';
import { video as videoApi } from '@api/videos';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import type { Video } from '@models/video';

vi.mock('@api/videos');

const mockVideo: Video = {
    id: '550e8400-e29b-41d4-a716-446655440000' as any,
    title: 'Test Video',
    description: 'Test Description',
    status: 'published' as any,
    views: 100,
    duration: 600,
    videoUrl: 'https://example.com/video.mp4',
    thumbnail: 'https://example.com/thumb.jpg',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    tags: ['test'],
    captions: [],
    channel: 'Test Channel',
    channelId: '550e8400-e29b-41d4-a716-446655440001' as any,
};

const mockSuggestion = {
    status: 'pending' as const,
    suggestedTitle: 'Better Title',
    suggestedDescription: 'Better Description',
    suggestedTags: ['tag1', 'tag2', 'tag3'],
};

describe('AiSuggestions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when no suggestion exists', async () => {
        vi.mocked(videoApi.getAiSuggestion).mockResolvedValue(null);

        const { container } = renderWithProviders(
            <AiSuggestions video={mockVideo} />,
        );

        await waitFor(() => {
            expect(container.querySelector('.ai-suggestions')).not.toBeInTheDocument();
        });
    });

    it('renders suggestion panel when data is available', async () => {
        vi.mocked(videoApi.getAiSuggestion).mockResolvedValue(mockSuggestion);

        renderWithProviders(
            <AiSuggestions video={mockVideo} />,
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue(mockSuggestion.suggestedTitle)).toBeInTheDocument();
        });

        expect(screen.getByDisplayValue(mockSuggestion.suggestedDescription)).toBeInTheDocument();
        expect(screen.getByText('tag1')).toBeInTheDocument();
        expect(screen.getByText('tag2')).toBeInTheDocument();
    });

    it('calls acceptAiSuggestion when accept button is clicked', async () => {
        const user = userEvent.setup();
        vi.mocked(videoApi.getAiSuggestion).mockResolvedValue(mockSuggestion);
        vi.mocked(videoApi.acceptAiSuggestion).mockResolvedValue(undefined);
        vi.mocked(videoApi.get).mockResolvedValue(mockVideo);

        renderWithProviders(
            <AiSuggestions video={mockVideo} />,
        );

        await waitFor(() => {
            expect(screen.getByText('tag1')).toBeInTheDocument();
        });

        const acceptBtn = screen.getByText(/accept/i);
        await user.click(acceptBtn);

        await waitFor(() => {
            expect(videoApi.acceptAiSuggestion).toHaveBeenCalledWith(mockVideo.id);
        });

        expect(videoApi.get).toHaveBeenCalledWith(mockVideo.id);
    });

    it('calls dismissAiSuggestion when dismiss button is clicked', async () => {
        const user = userEvent.setup();
        vi.mocked(videoApi.getAiSuggestion).mockResolvedValue(mockSuggestion);
        vi.mocked(videoApi.dismissAiSuggestion).mockResolvedValue(undefined);

        renderWithProviders(
            <AiSuggestions video={mockVideo} />,
        );

        await waitFor(() => {
            expect(screen.getByText('tag1')).toBeInTheDocument();
        });

        const dismissBtn = screen.getByText(/dismiss/i);
        await user.click(dismissBtn);

        await waitFor(() => {
            expect(videoApi.dismissAiSuggestion).toHaveBeenCalledWith(mockVideo.id);
        });
    });

    it('renders inputs as read-only', async () => {
        vi.mocked(videoApi.getAiSuggestion).mockResolvedValue(mockSuggestion);

        renderWithProviders(
            <AiSuggestions video={mockVideo} />,
        );

        await waitFor(() => {
            expect(screen.getByText('tag1')).toBeInTheDocument();
        });

        const titleInput = screen.getByDisplayValue(mockSuggestion.suggestedTitle) as HTMLInputElement;
        const descriptionInput = screen.getByDisplayValue(mockSuggestion.suggestedDescription) as HTMLTextAreaElement;

        expect(titleInput.readOnly).toBe(true);
        expect(descriptionInput.readOnly).toBe(true);
    });
});

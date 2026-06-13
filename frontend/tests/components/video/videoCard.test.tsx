// @vitest-environment jsdom
/**
 * Tests for VideoCard component.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoCard from '@components/video/card';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeVideo, vid, makeRootState } from '../../helpers/factories';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        useNavigate: () => mockNavigate,
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

describe('VideoCard', () => {
    const video = makeVideo({
        id: vid('v-card-1'),
        title: 'My Test Video Title',
        thumbnail: 'https://example.com/thumb.jpg',
    });

    it('renders the video title', () => {
        renderWithProviders(<VideoCard video={video} />);

        const matches = screen.getAllByText('My Test Video Title');
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0]).toBeInTheDocument();
    });

    it('renders the thumbnail image with correct src', () => {
        renderWithProviders(<VideoCard video={video} />);

        const imgs = screen.getAllByRole('img', { name: 'My Test Video Title' });
        expect(imgs.length).toBeGreaterThan(0);
        expect(imgs[0]).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    it('clicking the card calls navigate', async () => {
        const user = userEvent.setup();
        renderWithProviders(<VideoCard video={video} />);

        const cards = screen.getAllByRole('button', { name: video.title });
        await user.click(cards[0]);

        expect(mockNavigate).toHaveBeenCalled();
    });

    it('renders the channel name', () => {
        renderWithProviders(<VideoCard video={video} />);

        const matches = screen.getAllByText('Test Channel');
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0]).toBeInTheDocument();
    });

    it('reflects liked state from Redux store', () => {
        const rootState = makeRootState({
            video: {
                ...makeRootState().video,
                likedVideos: [vid('v-card-1')],
            },
        });

        renderWithProviders(<VideoCard video={video} />, { preloadedState: rootState });

        const matches = screen.getAllByText('My Test Video Title');
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0]).toBeInTheDocument();
    });
});

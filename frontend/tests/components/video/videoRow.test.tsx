// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import VideoRow from '@components/video/row';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeVideo, vid } from '../../helpers/factories';

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        useNavigate: () => vi.fn(),
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

describe('VideoRow', () => {
    const video = makeVideo({
        id: vid('v-row-1'),
        title: 'My Row Video Title',
        channel: 'Row Channel',
        thumbnail: 'https://example.com/row-thumb.jpg',
    });

    it('renders the video title', () => {
        renderWithProviders(<VideoRow video={video} />);

        expect(screen.getByText('My Row Video Title')).toBeInTheDocument();
    });

    it('renders the channel name', () => {
        renderWithProviders(<VideoRow video={video} />);

        const matches = screen.getAllByText('Row Channel');
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0]).toBeInTheDocument();
    });

    it('renders the thumbnail image', () => {
        renderWithProviders(<VideoRow video={video} />);

        const imgs = screen.getAllByRole('img', { name: 'My Row Video Title' });
        expect(imgs.length).toBeGreaterThan(0);
        expect(imgs[0]).toHaveAttribute('src', 'https://example.com/row-thumb.jpg');
    });
});

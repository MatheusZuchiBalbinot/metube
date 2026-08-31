// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import VideoMeta from '@components/video/videoMeta';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeVideo, vid } from '../../helpers/factories';
import { VideoStatus } from '@models/video';

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

describe('VideoMeta', () => {
    it('shows the view count for a published video', () => {
        const video = makeVideo({ id: vid('v-published'), status: VideoStatus.PUBLISHED, views: 1500 });

        renderWithProviders(<VideoMeta video={video} variant="card" />);

        expect(screen.getByText('1.5K video.views')).toBeInTheDocument();
    });

    it.each([VideoStatus.DRAFT, VideoStatus.PROCESSING, VideoStatus.FAILED])(
        'hides the view count for a %s video',
        (status) => {
            const video = makeVideo({ id: vid('v-not-live'), status, views: 999999 });

            renderWithProviders(<VideoMeta video={video} variant="card" />);

            expect(screen.queryByText(/video\.views/)).not.toBeInTheDocument();
        },
    );

    it('shows the view count for a scheduled video whose publish date is already in the past', () => {
        const video = makeVideo({
            id: vid('v-past-scheduled'),
            status: VideoStatus.SCHEDULED,
            scheduledAt: '2020-01-01T00:00:00Z',
            views: 42,
        });

        renderWithProviders(<VideoMeta video={video} variant="card" />);

        expect(screen.getByText('42 video.views')).toBeInTheDocument();
    });

    it('hides the view count for a scheduled video whose publish date is in the future', () => {
        const video = makeVideo({
            id: vid('v-future-scheduled'),
            status: VideoStatus.SCHEDULED,
            scheduledAt: '2999-01-01T00:00:00Z',
            views: 42,
        });

        renderWithProviders(<VideoMeta video={video} variant="card" />);

        expect(screen.queryByText(/video\.views/)).not.toBeInTheDocument();
    });

    it('still renders the relative date when views are hidden', () => {
        const video = makeVideo({ id: vid('v-draft'), status: VideoStatus.DRAFT });

        renderWithProviders(<VideoMeta video={video} variant="card" />);

        expect(screen.queryByText(/video\.views/)).not.toBeInTheDocument();
        expect(document.querySelector('.video-meta__date')).not.toBeEmptyDOMElement();
    });
});

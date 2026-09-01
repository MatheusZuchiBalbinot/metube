// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoFallback from '@pages/video/components/VideoFallback';
import { renderWithProviders } from '../../../helpers/renderWithProviders';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

describe('VideoFallback', () => {
    it('shows the generic no-video-file message by default', () => {
        renderWithProviders(<VideoFallback thumbnail={undefined} title="My video" />);

        expect(screen.getByText('video.no_video_file')).toBeInTheDocument();
        expect(screen.queryByText('video.processing_failed')).not.toBeInTheDocument();
    });

    it('shows a failure-specific message when isFailed is true', () => {
        renderWithProviders(<VideoFallback thumbnail={undefined} title="My video" isFailed />);

        expect(screen.getByText('video.processing_failed')).toBeInTheDocument();
        expect(screen.queryByText('video.no_video_file')).not.toBeInTheDocument();
    });

    it('does not show the delete-and-reupload action for a non-owner', () => {
        renderWithProviders(<VideoFallback thumbnail={undefined} title="My video" isFailed isOwner={false} />);

        expect(screen.queryByText('video.delete_and_reupload')).not.toBeInTheDocument();
    });

    it('lets the owner delete and re-upload a failed video', async () => {
        const onDeleteAndReupload = vi.fn();
        renderWithProviders(
            <VideoFallback thumbnail={undefined} title="My video" isFailed isOwner onDeleteAndReupload={onDeleteAndReupload} />,
        );

        const button = screen.getByText('video.delete_and_reupload');
        await userEvent.click(button);

        expect(onDeleteAndReupload).toHaveBeenCalledTimes(1);
    });
});

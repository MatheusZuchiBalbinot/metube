// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { ContinueWatchingSection } from '@components/sidebar/sidebarSections';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeRootState, makeVideoState, makeVideo, vid } from '../../helpers/factories';
import type { VideoId } from '@models/video';

function stateWith(progress: Record<string, number>, watchHistory: VideoId[]) {
    return makeRootState({
        video: makeVideoState({
            videos: [
                makeVideo({ id: vid('v1'), title: 'Resumable One' }),
                makeVideo({ id: vid('v2'), title: 'Finished Two' }),
            ],
            watchHistory,
            videoProgress: progress,
        }),
    });
}

describe('ContinueWatchingSection', () => {
    it('lists videos that are partway through', () => {
        renderWithProviders(<ContinueWatchingSection />, {
            preloadedState: stateWith({ v1: 40 }, [vid('v1')]),
        });

        expect(screen.getByText('Resumable One')).toBeInTheDocument();
    });

    it('omits videos that are effectively finished', () => {
        renderWithProviders(<ContinueWatchingSection />, {
            preloadedState: stateWith({ v2: 99 }, [vid('v2')]),
        });

        expect(screen.queryByText('Finished Two')).not.toBeInTheDocument();
    });

    it('renders nothing when there is no resumable history', () => {
        const { container } = renderWithProviders(<ContinueWatchingSection />, {
            preloadedState: stateWith({}, []),
        });

        expect(container).toBeEmptyDOMElement();
    });
});

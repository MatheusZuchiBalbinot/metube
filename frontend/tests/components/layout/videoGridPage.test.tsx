// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import VideoGridPage from '@components/layout/videoGridPage';
import { VideoFilter } from '@utils';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeVideo, vid, tag } from '../../helpers/factories';

describe('VideoGridPage', () => {
    it('renders the title and count when there are videos', () => {
        const videos = [makeVideo({ id: vid('v1') }), makeVideo({ id: vid('v2') })];

        renderWithProviders(
            <VideoGridPage
                title="Liked videos"
                videos={videos}
                filters={VideoFilter.emptyState()}
                onFiltersChange={() => undefined}
                emptyIcon={<span />}
                emptyDescription="Nothing liked yet"
                renderItem={video => <div key={video.id}>{video.title}</div>}
            />,
        );

        expect(screen.getByRole('heading', { name: 'Liked videos' })).toBeInTheDocument();
        expect(screen.getAllByText('Test Video')).toHaveLength(2);
    });

    it('shows the loading skeleton and hides the grid while loading', () => {
        const videos = [makeVideo({ id: vid('v1') })];

        renderWithProviders(
            <VideoGridPage
                title="Liked videos"
                videos={videos}
                filters={VideoFilter.emptyState()}
                onFiltersChange={() => undefined}
                loading
                emptyIcon={<span />}
                emptyDescription="Nothing liked yet"
                renderItem={video => <div key={video.id}>{video.title}</div>}
            />,
        );

        expect(screen.queryByRole('heading', { name: 'Liked videos' })).not.toBeInTheDocument();
        expect(screen.queryByText('Test Video')).not.toBeInTheDocument();
    });

    it('shows the empty state when there are no videos at all', () => {
        renderWithProviders(
            <VideoGridPage
                title="Liked videos"
                videos={[]}
                filters={VideoFilter.emptyState()}
                onFiltersChange={() => undefined}
                emptyIcon={<span />}
                emptyDescription="Nothing liked yet"
                renderItem={video => <div key={video.id}>{video.title}</div>}
            />,
        );

        expect(screen.getByText('Nothing liked yet')).toBeInTheDocument();
    });

    it('shows the no-results empty state when filters exclude every video', () => {
        const videos = [makeVideo({ id: vid('v1'), tags: [tag('music')] })];

        renderWithProviders(
            <VideoGridPage
                title="Liked videos"
                videos={videos}
                filters={{ ...VideoFilter.emptyState(), tags: [tag('nonexistent')] }}
                onFiltersChange={() => undefined}
                emptyIcon={<span />}
                emptyDescription="Nothing liked yet"
                renderItem={video => <div key={video.id}>{video.title}</div>}
            />,
        );

        expect(screen.queryByText('Nothing liked yet')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Video')).not.toBeInTheDocument();
    });

    it('renders each video via renderItem', () => {
        const videos = [
            makeVideo({ id: vid('v1'), title: 'First video' }),
            makeVideo({ id: vid('v2'), title: 'Second video' }),
        ];
        const renderItem = vi.fn((video: ReturnType<typeof makeVideo>) => <div key={video.id}>{video.title}</div>);

        renderWithProviders(
            <VideoGridPage
                title="Liked videos"
                videos={videos}
                filters={VideoFilter.emptyState()}
                onFiltersChange={() => undefined}
                emptyIcon={<span />}
                emptyDescription="Nothing liked yet"
                renderItem={renderItem}
            />,
        );

        expect(screen.getByText('First video')).toBeInTheDocument();
        expect(screen.getByText('Second video')).toBeInTheDocument();
        expect(renderItem).toHaveBeenCalledTimes(2);
    });
});

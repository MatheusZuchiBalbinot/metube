// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoSidebar from '@pages/video/components/VideoSidebar';
import { renderWithProviders } from '../../../helpers/renderWithProviders';
import type { VideoSummary } from '@api';

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

const summary: VideoSummary = {
    keyPoints: [],
    readingMode: '',
    chapters: [
        { timestamp: '0:00', title: 'Introduction' },
        { timestamp: '1:39', title: 'Setting up the project' },
        { timestamp: '3:18', title: 'Core implementation' },
    ],
};

function activeChapterTitle(): string | null {
    return document.querySelector('.video-page__chapter--active .video-page__chapter-title')?.textContent ?? null;
}

describe('VideoSidebar chapters', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('updates the active chapter as playback time advances, even though getCurrentTime is a new function every render', () => {
        vi.useFakeTimers();
        let time = 0;
        const videoRef = { current: null };

        const { rerender } = renderWithProviders(
            <VideoSidebar
                relatedVideos={[]}
                loadingRelated={false}
                summary={summary}
                transcription={null}
                getCurrentTime={() => time}
                onSeekToChapter={() => {}}
                videoRef={videoRef}
            />,
        );

        expect(activeChapterTitle()).toBe('Introduction');

        // Simulate the parent re-rendering (and thus recreating getCurrentTime)
        // several times within a single 1s polling window — this is exactly what
        // broke the interval before the fix (torn down before it could ever fire).
        time = 200;
        for (let i = 0; i < 5; i++) {
            act(() => {
                vi.advanceTimersByTime(150);
            });
            rerender(
                <VideoSidebar
                    relatedVideos={[]}
                    loadingRelated={false}
                    summary={summary}
                    transcription={null}
                    getCurrentTime={() => time}
                    onSeekToChapter={() => {}}
                    videoRef={videoRef}
                />,
            );
        }

        time = 100;
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(activeChapterTitle()).toBe('Setting up the project');
    });

    it('highlights the clicked chapter immediately, without waiting for the next poll', async () => {
        const user = userEvent.setup();
        const videoRef = { current: null };
        const onSeekToChapter = vi.fn();

        renderWithProviders(
            <VideoSidebar
                relatedVideos={[]}
                loadingRelated={false}
                summary={summary}
                transcription={null}
                getCurrentTime={() => 0}
                onSeekToChapter={onSeekToChapter}
                videoRef={videoRef}
            />,
        );

        const chapters = screen.getAllByRole('button', { name: /Core implementation|Setting up the project|Introduction/ });
        const target = chapters.find(btn => btn.textContent?.includes('Core implementation'));
        expect(target).toBeDefined();

        await user.click(target!);

        expect(onSeekToChapter).toHaveBeenCalledWith(198);
        expect(activeChapterTitle()).toBe('Core implementation');
    });
});

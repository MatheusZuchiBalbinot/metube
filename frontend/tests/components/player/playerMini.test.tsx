// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MiniVideoPlayer } from '@components/player/playerMini';

const usePlayerPlaybackMock = vi.hoisted(() => vi.fn());
const useShakaMock = vi.hoisted(() => vi.fn());

vi.mock('@hooks', () => ({
    usePlayerPlayback: usePlayerPlaybackMock,
    useShaka: useShakaMock,
}));

function basePlayback(overrides: Partial<ReturnType<typeof usePlayerPlaybackMock>> = {}) {
    return {
        isPlaying: false,
        progressPct: 40,
        handleVideoPlay: vi.fn(),
        handleVideoPause: vi.fn(),
        handleVideoTimeUpdate: vi.fn(),
        handleVideoLoadedMetadata: vi.fn(),
        handleVideoEnded: vi.fn(),
        handleVideoProgress: vi.fn(),
        handleTogglePlay: vi.fn(),
        ...overrides,
    };
}

function makeVideoRef() {
    return { current: null as HTMLVideoElement | null };
}

// React replaces `videoRef.current` with the real mounted DOM node on render, so
// duration/currentTime must be stubbed on the post-render element, not before.
function stubDuration(el: HTMLVideoElement, duration: number) {
    Object.defineProperty(el, 'duration', { value: duration, configurable: true });
    Object.defineProperty(el, 'currentTime', { value: 0, writable: true, configurable: true });
}

describe('MiniVideoPlayer', () => {
    it('renders the play label when paused and toggles play on button click', () => {
        const handleTogglePlay = vi.fn();
        usePlayerPlaybackMock.mockReturnValue(basePlayback({ isPlaying: false, handleTogglePlay }));

        render(<MiniVideoPlayer videoRef={makeVideoRef()} src="video.mp4" />);

        const btn = screen.getByRole('button', { name: 'Play' });
        fireEvent.click(btn);

        expect(handleTogglePlay).toHaveBeenCalled();
    });

    it('shows the pause label when playing', () => {
        usePlayerPlaybackMock.mockReturnValue(basePlayback({ isPlaying: true }));

        render(<MiniVideoPlayer videoRef={makeVideoRef()} src="video.mp4" />);

        expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('seeks the video when the progress bar is clicked', () => {
        usePlayerPlaybackMock.mockReturnValue(basePlayback());
        const videoRef = makeVideoRef();

        const { container } = render(<MiniVideoPlayer videoRef={videoRef} src="video.mp4" />);
        stubDuration(videoRef.current!, 100);

        const progress = container.querySelector('.vp__mini-progress') as HTMLElement;
        vi.spyOn(progress, 'getBoundingClientRect').mockReturnValue({
            left: 0, right: 200, width: 200, top: 0, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}),
        });

        fireEvent.click(progress, { clientX: 50 });

        expect(videoRef.current!.currentTime).toBe(25);
    });

    it('does not seek when the video has no duration yet', () => {
        usePlayerPlaybackMock.mockReturnValue(basePlayback());
        const videoRef = makeVideoRef();

        const { container } = render(<MiniVideoPlayer videoRef={videoRef} src="video.mp4" />);
        stubDuration(videoRef.current!, 0);
        videoRef.current!.currentTime = 5;

        const progress = container.querySelector('.vp__mini-progress') as HTMLElement;
        vi.spyOn(progress, 'getBoundingClientRect').mockReturnValue({
            left: 0, right: 200, width: 200, top: 0, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}),
        });

        fireEvent.click(progress, { clientX: 50 });

        expect(videoRef.current!.currentTime).toBe(5);
    });

    it('exposes the progress bar as a keyboard-accessible slider', () => {
        usePlayerPlaybackMock.mockReturnValue(basePlayback({ currentTime: 40, duration: 100, progressPct: 40 }));

        const { container } = render(<MiniVideoPlayer videoRef={makeVideoRef()} src="video.mp4" />);
        const progress = container.querySelector('.vp__mini-progress') as HTMLElement;

        expect(progress).toHaveAttribute('role', 'slider');
        expect(progress).toHaveAttribute('tabindex', '0');
        expect(progress).toHaveAttribute('aria-valuemin', '0');
        expect(progress).toHaveAttribute('aria-valuemax', '100');
        expect(progress).toHaveAttribute('aria-valuenow', '40');
        expect(progress).not.toHaveAttribute('aria-hidden');
    });

    it('seeks forward and backward with ArrowRight/ArrowLeft on the progress bar', () => {
        usePlayerPlaybackMock.mockReturnValue(basePlayback({ currentTime: 40, duration: 100, progressPct: 40 }));
        const videoRef = makeVideoRef();

        const { container } = render(<MiniVideoPlayer videoRef={videoRef} src="video.mp4" />);
        stubDuration(videoRef.current!, 100);
        Object.defineProperty(videoRef.current!, 'currentTime', { value: 40, writable: true, configurable: true });

        const progress = container.querySelector('.vp__mini-progress') as HTMLElement;

        fireEvent.keyDown(progress, { key: 'ArrowRight' });
        expect(videoRef.current!.currentTime).toBe(45);

        fireEvent.keyDown(progress, { key: 'ArrowLeft' });
        expect(videoRef.current!.currentTime).toBe(35);
    });
});

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortPlayer from '@components/player/playerShort';
import { PopIconType } from '@enums/popIconType';
import { SkipDirection } from '@enums/skipDirection';

const usePlayerPlaybackMock = vi.hoisted(() => vi.fn());
const usePlayerKeyboardMock = vi.hoisted(() => vi.fn());
const usePopIconMock = vi.hoisted(() => vi.fn());
const useSkipIndicatorMock = vi.hoisted(() => vi.fn());
const useShakaMock = vi.hoisted(() => vi.fn());

vi.mock('@hooks', () => ({
    usePlayerPlayback: usePlayerPlaybackMock,
    usePlayerKeyboard: usePlayerKeyboardMock,
    usePopIcon: usePopIconMock,
    useSkipIndicator: useSkipIndicatorMock,
    useShaka: useShakaMock,
}));

function basePlayback(overrides: Record<string, unknown> = {}) {
    return {
        isPlaying: false,
        isBuffering: false,
        progressPct: 20,
        handleVideoPlay: vi.fn(),
        handleVideoPause: vi.fn(),
        handleVideoTimeUpdate: vi.fn(),
        handleVideoLoadedMetadata: vi.fn(),
        handleVideoEnded: vi.fn(),
        handleTogglePlay: vi.fn(),
        applyMuteToggle: vi.fn(),
        setIsBuffering: vi.fn(),
        ...overrides,
    };
}

function setup(playbackOverrides: Record<string, unknown> = {}, popIcon: unknown = null, skipIndicator: unknown = null) {
    usePlayerPlaybackMock.mockReturnValue(basePlayback(playbackOverrides));
    usePopIconMock.mockReturnValue({ popIcon, showPopIcon: vi.fn(), resetPopIcon: vi.fn() });
    useSkipIndicatorMock.mockReturnValue({ skipIndicator, showSkipIndicator: vi.fn(), resetSkipIndicator: vi.fn() });

    const videoRef = { current: null as HTMLVideoElement | null };
    const utils = render(<ShortPlayer videoRef={videoRef} src="short.mp4" />);
    return { ...utils, videoRef };
}

describe('ShortPlayer', () => {
    it('shows the play label when paused and toggles play + calls onTap when the tap button is clicked', () => {
        const handleTogglePlay = vi.fn();
        const onTap = vi.fn();
        usePlayerPlaybackMock.mockReturnValue(basePlayback({ isPlaying: false, handleTogglePlay }));
        usePopIconMock.mockReturnValue({ popIcon: null, showPopIcon: vi.fn(), resetPopIcon: vi.fn() });
        useSkipIndicatorMock.mockReturnValue({ skipIndicator: null, showSkipIndicator: vi.fn(), resetSkipIndicator: vi.fn() });

        const videoRef = { current: null as HTMLVideoElement | null };
        render(<ShortPlayer videoRef={videoRef} src="short.mp4" onTap={onTap} />);

        fireEvent.click(screen.getByRole('button', { name: 'Play' }));

        expect(onTap).toHaveBeenCalled();
        expect(handleTogglePlay).toHaveBeenCalled();
    });

    it('shows the pause label when playing', () => {
        setup({ isPlaying: true });

        expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('seeks the video via the range input when the video has a duration', () => {
        const { container, videoRef } = setup();
        Object.defineProperty(videoRef.current!, 'duration', { value: 100, configurable: true });
        Object.defineProperty(videoRef.current!, 'currentTime', { value: 0, writable: true, configurable: true });

        const input = container.querySelector('.vp__short-seek-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '60' } });

        expect(videoRef.current!.currentTime).toBe(60);
    });

    it('does not seek when the video has no duration yet', () => {
        const { container, videoRef } = setup();
        Object.defineProperty(videoRef.current!, 'duration', { value: 0, configurable: true });
        Object.defineProperty(videoRef.current!, 'currentTime', { value: 5, writable: true, configurable: true });

        const input = container.querySelector('.vp__short-seek-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '60' } });

        expect(videoRef.current!.currentTime).toBe(5);
    });

    it('shows the buffering spinner while the video is buffering', () => {
        const { container } = setup({ isBuffering: true });

        expect(container.querySelector('.vp__buffering')).toBeInTheDocument();
    });

    it('renders the pop icon when one is active', () => {
        const { container } = setup({}, { key: 1, type: PopIconType.PLAY });

        expect(container.querySelector('.vp__pop-icon')).toBeInTheDocument();
    });

    it('renders the skip indicator with the direction and seconds', () => {
        const { container } = setup({}, null, { key: 1, dir: SkipDirection.FWD, count: 2 });

        expect(container.querySelector('.vp__skip-indicator--fwd')).toBeInTheDocument();
        expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('registers the mounted video element with onVideoMounted and clears it on unmount', () => {
        const onVideoMounted = vi.fn();
        usePlayerPlaybackMock.mockReturnValue(basePlayback());
        usePopIconMock.mockReturnValue({ popIcon: null, showPopIcon: vi.fn(), resetPopIcon: vi.fn() });
        useSkipIndicatorMock.mockReturnValue({ skipIndicator: null, showSkipIndicator: vi.fn(), resetSkipIndicator: vi.fn() });

        const videoRef = { current: null as HTMLVideoElement | null };
        const { unmount } = render(<ShortPlayer videoRef={videoRef} src="short.mp4" onVideoMounted={onVideoMounted} />);

        expect(onVideoMounted).toHaveBeenCalledWith(videoRef.current);

        unmount();

        expect(onVideoMounted).toHaveBeenLastCalledWith(null);
    });

    it('renders children passed to it', () => {
        usePlayerPlaybackMock.mockReturnValue(basePlayback());
        usePopIconMock.mockReturnValue({ popIcon: null, showPopIcon: vi.fn(), resetPopIcon: vi.fn() });
        useSkipIndicatorMock.mockReturnValue({ skipIndicator: null, showSkipIndicator: vi.fn(), resetSkipIndicator: vi.fn() });

        const videoRef = { current: null as HTMLVideoElement | null };
        render(
            <ShortPlayer videoRef={videoRef} src="short.mp4">
                <div data-testid="overlay-child">overlay</div>
            </ShortPlayer>,
        );

        expect(screen.getByTestId('overlay-child')).toBeInTheDocument();
    });
});

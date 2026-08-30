// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DefaultVideoPlayer } from '@components/player/playerDefault';
import { PopIconType } from '@enums/popIconType';

const usePlayerControlsMock = vi.hoisted(() => vi.fn());
const usePlayerPlaybackMock = vi.hoisted(() => vi.fn());
const usePlayerKeyboardMock = vi.hoisted(() => vi.fn());
const usePlayerCaptionsMock = vi.hoisted(() => vi.fn());
const usePictureInPictureMock = vi.hoisted(() => vi.fn());
const useShakaMock = vi.hoisted(() => vi.fn());
const usePopIconMock = vi.hoisted(() => vi.fn());
const useSkipIndicatorMock = vi.hoisted(() => vi.fn());
const useFullscreenMock = vi.hoisted(() => vi.fn());
const useVolumeWheelMock = vi.hoisted(() => vi.fn());
const useClickDoubleClickMock = vi.hoisted(() => vi.fn());
const useClickOutsideMock = vi.hoisted(() => vi.fn());
const usePlayerAbRepeatMock = vi.hoisted(() => vi.fn());
const usePlayerHoldSpeedMock = vi.hoisted(() => vi.fn());
const usePlayerLocalPrefsMock = vi.hoisted(() => vi.fn());
const usePlaybackPrefsMock = vi.hoisted(() => vi.fn());

vi.mock('@hooks', () => ({
    usePlayerControls: usePlayerControlsMock,
    usePlayerPlayback: usePlayerPlaybackMock,
    usePlayerKeyboard: usePlayerKeyboardMock,
    usePlayerCaptions: usePlayerCaptionsMock,
    usePictureInPicture: usePictureInPictureMock,
    useShaka: useShakaMock,
    usePopIcon: usePopIconMock,
    useSkipIndicator: useSkipIndicatorMock,
    useFullscreen: useFullscreenMock,
    useVolumeWheel: useVolumeWheelMock,
    useClickDoubleClick: useClickDoubleClickMock,
    useClickOutside: useClickOutsideMock,
    usePlayerAbRepeat: usePlayerAbRepeatMock,
    usePlayerHoldSpeed: usePlayerHoldSpeedMock,
    HOLD_SPEED_RATE: 2,
    usePlayerLocalPrefs: usePlayerLocalPrefsMock,
    usePlaybackPrefs: usePlaybackPrefsMock,
}));

vi.mock('@components/player/playerOverlays', () => ({
    default: () => <div data-testid="overlays" />,
}));

vi.mock('@components/player/playerSeekBar', () => ({
    default: (props: { onDraggingChange: (v: boolean) => void }) => (
        <button data-testid="seek-bar" onClick={() => props.onDraggingChange(true)}>seek-bar</button>
    ),
}));

vi.mock('@components/player/playerControlsBar', () => ({
    default: (props: {
        playback: { onTogglePlay: (e: React.MouseEvent) => void; isAutoplay: boolean; onToggleAutoplay: () => void }
        display: {
            onTheater: (e: React.MouseEvent) => void
            onFullscreen: (e: React.MouseEvent) => void
            onPip: (e: React.MouseEvent) => void
        }
        menus: { showSettings: boolean; onToggleSettings: (e: React.MouseEvent) => void }
    }) => (
        <div data-testid="controls-bar">
            <button aria-label="toggle-play" onClick={props.playback.onTogglePlay}>toggle-play</button>
            <button aria-label="toggle-theater" onClick={props.display.onTheater}>toggle-theater</button>
            <button aria-label="toggle-fullscreen" onClick={props.display.onFullscreen}>toggle-fullscreen</button>
            <button aria-label="toggle-pip" onClick={props.display.onPip}>toggle-pip</button>
            <button aria-label="toggle-settings" onClick={props.menus.onToggleSettings}>toggle-settings</button>
            <span data-testid="settings-state">{String(props.menus.showSettings)}</span>
        </div>
    ),
}));

function makeVideoRef() {
    return { current: null as HTMLVideoElement | null };
}

// React replaces `videoRef.current` with the real mounted DOM node on render, so
// `paused` must be stubbed on the post-render element, not before.
function stubPaused(videoRef: { current: HTMLVideoElement | null }, paused: boolean) {
    Object.defineProperty(videoRef.current, 'paused', { value: paused, configurable: true });
}

function setupHooks(overrides: {
    showPopIcon?: ReturnType<typeof vi.fn>
    handleTogglePlay?: ReturnType<typeof vi.fn>
    setShowControls?: ReturnType<typeof vi.fn>
    resetPopIcon?: ReturnType<typeof vi.fn>
    resetSkipIndicator?: ReturnType<typeof vi.fn>
    toggleFullscreen?: ReturnType<typeof vi.fn>
    togglePiP?: ReturnType<typeof vi.fn>
} = {}) {
    const setShowControls = overrides.setShowControls ?? vi.fn();
    const showPopIcon = overrides.showPopIcon ?? vi.fn();
    const handleTogglePlay = overrides.handleTogglePlay ?? vi.fn();
    const resetPopIcon = overrides.resetPopIcon ?? vi.fn();
    const resetSkipIndicator = overrides.resetSkipIndicator ?? vi.fn();
    const toggleFullscreen = overrides.toggleFullscreen ?? vi.fn();
    const togglePiP = overrides.togglePiP ?? vi.fn();

    usePlayerControlsMock.mockReturnValue({
        showControls: true,
        setShowControls,
        scheduleHideControls: vi.fn(),
        revealControls: vi.fn(),
        forceShow: vi.fn(),
    });

    usePlayerPlaybackMock.mockReturnValue({
        isPlaying: false,
        isBuffering: false,
        currentTime: 10,
        duration: 100,
        volume: 1,
        isMuted: false,
        playbackRate: 1,
        bufferedPct: 20,
        setIsBuffering: vi.fn(),
        handleVideoPlay: vi.fn(),
        handleVideoPause: vi.fn(),
        handleVideoTimeUpdate: vi.fn(),
        handleVideoLoadedMetadata: vi.fn(),
        handleVideoEnded: vi.fn(),
        handleVideoProgress: vi.fn(),
        handleTogglePlay,
        applyVolume: vi.fn(),
        applyMuteToggle: vi.fn(),
        applyPlaybackRate: vi.fn(),
    });

    usePopIconMock.mockReturnValue({ popIcon: null, showPopIcon, resetPopIcon });
    useSkipIndicatorMock.mockReturnValue({ skipIndicator: null, showSkipIndicator: vi.fn(), resetSkipIndicator });
    useFullscreenMock.mockReturnValue({ isFullscreen: false, toggleFullscreen });
    usePictureInPictureMock.mockReturnValue({ isActive: false, isSupported: true, togglePiP });
    useShakaMock.mockReturnValue({ levels: [], currentQuality: -1, setQuality: vi.fn(), tracksLoaded: false });
    usePlayerCaptionsMock.mockReturnValue({ activeTrack: null, setActiveTrack: vi.fn() });
    useVolumeWheelMock.mockReturnValue(undefined);
    useClickOutsideMock.mockReturnValue(undefined);
    useClickDoubleClickMock.mockReturnValue({ handleClick: vi.fn(), handleDoubleClick: vi.fn() });
    usePlayerAbRepeatMock.mockReturnValue({ abRepeat: { a: null, b: null }, abStatus: 0, handleAbRepeat: vi.fn() });
    usePlayerHoldSpeedMock.mockReturnValue({
        holdSpeedActive: false,
        handleSurfacePointerDown: vi.fn(),
        handleSurfacePointerEnd: vi.fn(),
        handleSurfaceClick: vi.fn(),
    });
    usePlayerLocalPrefsMock.mockReturnValue({
        ambientEnabled: false, toggleAmbient: vi.fn(), captionSize: 'md', setCaptionSize: vi.fn(),
    });
    usePlaybackPrefsMock.mockReturnValue({ autoplay: true, setAutoplay: vi.fn() });
    usePlayerKeyboardMock.mockReturnValue(undefined);

    return { setShowControls, showPopIcon, handleTogglePlay, resetPopIcon, resetSkipIndicator, toggleFullscreen, togglePiP };
}

describe('DefaultVideoPlayer', () => {
    beforeEach(() => {
        setupHooks();
    });

    it('renders the video element and the seek/controls bars', () => {
        render(<DefaultVideoPlayer videoRef={makeVideoRef()} src="video.mp4" />);

        expect(document.querySelector('.vp__video')).toBeInTheDocument();
        expect(screen.getByTestId('seek-bar')).toBeInTheDocument();
        expect(screen.getByTestId('controls-bar')).toBeInTheDocument();
    });

    it('toggles play and shows the play pop icon when the paused video is toggled', () => {
        const { handleTogglePlay, showPopIcon } = setupHooks();
        const videoRef = makeVideoRef();
        render(<DefaultVideoPlayer videoRef={videoRef} src="video.mp4" />);
        stubPaused(videoRef, true);

        fireEvent.click(screen.getByLabelText('toggle-play'));

        expect(handleTogglePlay).toHaveBeenCalled();
        expect(showPopIcon).toHaveBeenCalledWith(PopIconType.PLAY);
    });

    it('shows the pause pop icon when toggling play on a currently-playing video', () => {
        const { showPopIcon } = setupHooks();
        const videoRef = makeVideoRef();
        render(<DefaultVideoPlayer videoRef={videoRef} src="video.mp4" />);
        stubPaused(videoRef, false);

        fireEvent.click(screen.getByLabelText('toggle-play'));

        expect(showPopIcon).toHaveBeenCalledWith(PopIconType.PAUSE);
    });

    it('applies the theater class and marks the wrapper as seeking once the seek bar reports dragging', () => {
        const { container } = render(
            <DefaultVideoPlayer videoRef={makeVideoRef()} src="video.mp4" theaterMode onTheaterToggle={vi.fn()} />,
        );
        const wrapper = container.querySelector('.vp') as HTMLElement;
        expect(wrapper).toHaveClass('vp--theater');
        expect(wrapper).not.toHaveClass('vp--seeking');

        fireEvent.click(screen.getByTestId('seek-bar'));

        expect(wrapper).toHaveClass('vp--seeking');
    });

    it('hides controls on mouse leave only while the video is playing', () => {
        const { setShowControls } = setupHooks();
        const videoRef = makeVideoRef();
        const { container } = render(<DefaultVideoPlayer videoRef={videoRef} src="video.mp4" />);
        stubPaused(videoRef, false);

        fireEvent.mouseLeave(container.querySelector('.vp') as HTMLElement);

        expect(setShowControls).toHaveBeenCalledWith(false);
    });

    it('does not hide controls on mouse leave while the video is paused', () => {
        const { setShowControls } = setupHooks();
        const videoRef = makeVideoRef();
        const { container } = render(<DefaultVideoPlayer videoRef={videoRef} src="video.mp4" />);
        stubPaused(videoRef, true);

        fireEvent.mouseLeave(container.querySelector('.vp') as HTMLElement);

        expect(setShowControls).not.toHaveBeenCalled();
    });

    it('resets popIcon/skip-indicator state and closes the settings menu when the source changes', () => {
        const { resetPopIcon, resetSkipIndicator } = setupHooks();
        const { rerender } = render(<DefaultVideoPlayer videoRef={makeVideoRef()} src="video-a.mp4" />);

        fireEvent.click(screen.getByLabelText('toggle-settings'));
        expect(screen.getByTestId('settings-state')).toHaveTextContent('true');

        rerender(<DefaultVideoPlayer videoRef={makeVideoRef()} src="video-b.mp4" />);

        expect(resetPopIcon).toHaveBeenCalled();
        expect(resetSkipIndicator).toHaveBeenCalled();
        expect(screen.getByTestId('settings-state')).toHaveTextContent('false');
    });

    it('wires the theater/fullscreen/pip buttons to their respective handlers independently', () => {
        const onTheaterToggle = vi.fn();
        const { toggleFullscreen, togglePiP } = setupHooks();
        render(<DefaultVideoPlayer videoRef={makeVideoRef()} src="video.mp4" onTheaterToggle={onTheaterToggle} />);

        fireEvent.click(screen.getByLabelText('toggle-theater'));
        expect(onTheaterToggle).toHaveBeenCalled();
        expect(toggleFullscreen).not.toHaveBeenCalled();
        expect(togglePiP).not.toHaveBeenCalled();

        fireEvent.click(screen.getByLabelText('toggle-fullscreen'));
        expect(toggleFullscreen).toHaveBeenCalled();

        fireEvent.click(screen.getByLabelText('toggle-pip'));
        expect(togglePiP).toHaveBeenCalled();
    });

    it('defaults captureKeyboard to true when the prop is not provided', () => {
        render(<DefaultVideoPlayer videoRef={makeVideoRef()} src="video.mp4" />);

        expect(usePlayerKeyboardMock).toHaveBeenCalledWith(expect.objectContaining({ captureKeyboard: true }));
    });

    it('forwards captureKeyboard: false through to the keyboard hook', () => {
        render(<DefaultVideoPlayer videoRef={makeVideoRef()} src="video.mp4" captureKeyboard={false} />);

        expect(usePlayerKeyboardMock).toHaveBeenCalledWith(expect.objectContaining({ captureKeyboard: false }));
    });
});

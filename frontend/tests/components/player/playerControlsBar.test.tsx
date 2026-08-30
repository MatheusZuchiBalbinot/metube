// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ui';
import PlayerControlsBar, {
    type PlayerControlsPlayback,
    type PlayerControlsAudio,
    type PlayerControlsDisplay,
    type PlayerControlsMenus,
} from '@components/player/playerControlsBar';

function basePlayback(overrides: Partial<PlayerControlsPlayback> = {}): PlayerControlsPlayback {
    return {
        isPlaying: false,
        currentTime: 30,
        duration: 120,
        playbackRate: 1,
        onTogglePlay: vi.fn(),
        onSpeedChange: vi.fn(),
        isLoop: false,
        onToggleLoop: vi.fn(),
        abStatus: 0,
        onAbRepeat: vi.fn(),
        isAutoplay: true,
        onToggleAutoplay: vi.fn(),
        chapterTitle: null,
        ...overrides,
    };
}

function baseAudio(overrides: Partial<PlayerControlsAudio> = {}): PlayerControlsAudio {
    return {
        volume: 0.8,
        isMuted: false,
        onToggleMute: vi.fn(),
        onVolumeChange: vi.fn(),
        ...overrides,
    };
}

function baseDisplay(overrides: Partial<PlayerControlsDisplay> = {}): PlayerControlsDisplay {
    return {
        isFullscreen: false,
        isTheaterMode: false,
        isPiP: false,
        isPiPSupported: true,
        showTheaterButton: true,
        fullscreenIcon: <span data-testid="fs-icon" />,
        onFullscreen: vi.fn(),
        onTheater: vi.fn(),
        onPip: vi.fn(),
        isAmbient: false,
        onToggleAmbient: vi.fn(),
        captionSize: 'md',
        onCaptionSize: vi.fn(),
        ...overrides,
    };
}

function baseMenus(overrides: Partial<PlayerControlsMenus> = {}): PlayerControlsMenus {
    return {
        showSettings: false,
        settingsRef: { current: null },
        onToggleSettings: vi.fn(),
        captions: [],
        activeTrack: null,
        showCaptionsMenu: false,
        captionsMenuRef: { current: null },
        onToggleCaptionsMenu: vi.fn(),
        onCaptionSelect: vi.fn(),
        levels: [],
        currentQuality: -1,
        onQualityChange: vi.fn(),
        onBarClick: vi.fn(),
        ...overrides,
    };
}

function renderBar(overrides: {
    playback?: Partial<PlayerControlsPlayback>
    audio?: Partial<PlayerControlsAudio>
    display?: Partial<PlayerControlsDisplay>
    menus?: Partial<PlayerControlsMenus>
} = {}) {
    return render(
        <TooltipProvider delayDuration={0}>
            <PlayerControlsBar
                playback={basePlayback(overrides.playback)}
                audio={baseAudio(overrides.audio)}
                display={baseDisplay(overrides.display)}
                menus={baseMenus(overrides.menus)}
            />
        </TooltipProvider>,
    );
}

describe('PlayerControlsBar', () => {
    it('shows the play icon label when paused and pause label when playing', () => {
        const { rerender } = render(
            <TooltipProvider delayDuration={0}>
                <PlayerControlsBar
                    playback={basePlayback({ isPlaying: false })}
                    audio={baseAudio()}
                    display={baseDisplay()}
                    menus={baseMenus()}
                />
            </TooltipProvider>,
        );
        expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

        rerender(
            <TooltipProvider delayDuration={0}>
                <PlayerControlsBar
                    playback={basePlayback({ isPlaying: true })}
                    audio={baseAudio()}
                    display={baseDisplay()}
                    menus={baseMenus()}
                />
            </TooltipProvider>,
        );
        expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('calls onTogglePlay when the play/pause button is clicked', async () => {
        const onTogglePlay = vi.fn();
        renderBar({ playback: { onTogglePlay } });

        await userEvent.click(screen.getByRole('button', { name: 'Play' }));

        expect(onTogglePlay).toHaveBeenCalled();
    });

    it('shows elapsed / total time by default and toggles to remaining time on click', async () => {
        renderBar({ playback: { currentTime: 30, duration: 120 } });

        const timeBtn = screen.getByTitle('Toggle remaining time');
        expect(timeBtn).toHaveTextContent('0:30 / 2:00');

        await userEvent.click(timeBtn);

        expect(timeBtn).toHaveTextContent('-1:30 / 2:00');
    });

    it('renders the chapter title when provided', () => {
        renderBar({ playback: { chapterTitle: 'Intro' } });

        expect(screen.getByText('Intro')).toBeInTheDocument();
    });

    it('reflects the muted state in the mute button label', () => {
        renderBar({ audio: { isMuted: true } });

        expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
    });

    it('marks the loop toggle as pressed when isLoop is true', () => {
        renderBar({ playback: { isLoop: true } });

        expect(screen.getByRole('button', { name: 'Loop' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onToggleAutoplay when the autoplay toggle is clicked', async () => {
        const onToggleAutoplay = vi.fn();
        renderBar({ playback: { onToggleAutoplay } });

        await userEvent.click(screen.getByRole('button', { name: 'Autoplay' }));

        expect(onToggleAutoplay).toHaveBeenCalled();
    });

    it('hides the theater button when showTheaterButton is false', () => {
        renderBar({ display: { showTheaterButton: false } });

        expect(screen.queryByRole('button', { name: 'Theater mode' })).not.toBeInTheDocument();
    });

    it('shows the theater button when showTheaterButton is true', () => {
        renderBar({ display: { showTheaterButton: true, isTheaterMode: false } });

        expect(screen.getByRole('button', { name: 'Theater mode' })).toBeInTheDocument();
    });

    it('calls onFullscreen when the fullscreen button is clicked', async () => {
        const onFullscreen = vi.fn();
        renderBar({ display: { onFullscreen } });

        await userEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));

        expect(onFullscreen).toHaveBeenCalled();
    });
});

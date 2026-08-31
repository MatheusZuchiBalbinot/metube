// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayerSettings from '@components/player/playerSettings';

function baseProps(): React.ComponentProps<typeof PlayerSettings> {
    return {
        playbackRate: 1,
        showSettings: true,
        settingsRef: { current: null },
        onToggle: vi.fn(),
        onSpeedChange: vi.fn(),
    };
}

describe('PlayerSettings', () => {
    it('renders only the toggle button when the panel is closed', () => {
        render(<PlayerSettings {...baseProps()} showSettings={false} />);

        expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.queryByRole('listbox', { name: 'Speed' })).not.toBeInTheDocument();
    });

    it('shows the current speed on the root row and drills into the speed submenu on click', async () => {
        render(<PlayerSettings {...baseProps()} playbackRate={1.5} />);

        expect(screen.getByRole('button', { name: /speed/i })).toHaveTextContent('1.5×');
        expect(screen.queryByRole('option', { name: '1.5×' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /speed/i }));

        expect(screen.getByRole('option', { name: '1.5×' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('option', { name: '1×' })).toHaveAttribute('aria-selected', 'false');
    });

    it('calls onSpeedChange with the clicked rate and returns to the root list', async () => {
        const onSpeedChange = vi.fn();
        render(<PlayerSettings {...baseProps()} onSpeedChange={onSpeedChange} />);

        await userEvent.click(screen.getByRole('button', { name: /speed/i }));
        await userEvent.click(screen.getByRole('option', { name: '2×' }));

        expect(onSpeedChange).toHaveBeenCalledWith(expect.anything(), 2);
        expect(screen.queryByRole('option', { name: '2×' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /speed/i })).toBeInTheDocument();
    });

    it('the back button in a submenu returns to the root list without applying anything', async () => {
        const onSpeedChange = vi.fn();
        render(<PlayerSettings {...baseProps()} onSpeedChange={onSpeedChange} />);

        await userEvent.click(screen.getByRole('button', { name: /speed/i }));
        await userEvent.click(screen.getByRole('button', { name: /^speed$/i }));

        expect(onSpeedChange).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /speed/i })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: '1×' })).not.toBeInTheDocument();
    });

    it('does not render the quality row when there are no levels', () => {
        render(<PlayerSettings {...baseProps()} levels={[]} />);

        expect(screen.queryByRole('button', { name: /quality/i })).not.toBeInTheDocument();
    });

    it('drills into quality and renders its options including Auto', async () => {
        render(
            <PlayerSettings
                {...baseProps()}
                levels={[{ index: 0, height: 1080, bitrate: 5000, label: '1080p' }]}
                currentQuality={-1}
                onQualityChange={vi.fn()}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: /quality/i }));

        expect(screen.getByRole('option', { name: 'Auto' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '1080p' })).toBeInTheDocument();
    });

    it('shows the compact toggles mirrored from the controls bar', () => {
        render(
            <PlayerSettings
                {...baseProps()}
                isLoop={true}
                onToggleLoop={vi.fn()}
                isAutoplay={false}
                onToggleAutoplay={vi.fn()}
            />,
        );

        const loopSwitch = screen.getByRole('switch', { name: /Loop/i });
        expect(loopSwitch).toHaveAttribute('aria-checked', 'true');
    });

    it('toggling a compact row calls its handler', async () => {
        const onToggleLoop = vi.fn();
        render(<PlayerSettings {...baseProps()} isLoop={false} onToggleLoop={onToggleLoop} />);

        await userEvent.click(screen.getByRole('switch', { name: /Loop/i }));

        expect(onToggleLoop).toHaveBeenCalled();
    });
});

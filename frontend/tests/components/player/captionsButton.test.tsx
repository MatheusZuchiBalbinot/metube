// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ui';
import CaptionsButton from '@components/player/captionsButton';
import type { VideoCaption } from '@models';

const captions: VideoCaption[] = [
    { lang: 'en', label: 'English', url: 'https://example.com/en.vtt' },
    { lang: 'pt', label: 'Português', url: 'https://example.com/pt.vtt' },
];

function renderButton(props: Partial<React.ComponentProps<typeof CaptionsButton>> = {}) {
    return render(
        <TooltipProvider delayDuration={0}>
            <CaptionsButton
                captions={captions}
                activeTrack={null}
                showMenu={false}
                menuRef={{ current: null }}
                onToggle={vi.fn()}
                onSelect={vi.fn()}
                {...props}
            />
        </TooltipProvider>,
    );
}

describe('CaptionsButton', () => {
    it('renders nothing when there are no captions', () => {
        renderButton({ captions: [] });

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders the toggle button with an inactive state when no track is selected', () => {
        renderButton({ activeTrack: null });

        const button = screen.getByRole('button', { name: 'Captions' });
        expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('marks the toggle as active when a track is selected', () => {
        renderButton({ activeTrack: 'en' });

        expect(screen.getByRole('button', { name: 'Captions' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onToggle when the button is clicked', async () => {
        const onToggle = vi.fn();
        renderButton({ onToggle });

        await userEvent.click(screen.getByRole('button', { name: 'Captions' }));

        expect(onToggle).toHaveBeenCalled();
    });

    it('lists every caption option plus "off" when the menu is open', () => {
        renderButton({ showMenu: true });

        expect(screen.getByRole('option', { name: 'Off' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Português' })).toBeInTheDocument();
    });

    it('calls onSelect with the language when an option is clicked', async () => {
        const onSelect = vi.fn();
        renderButton({ showMenu: true, onSelect });

        await userEvent.click(screen.getByRole('option', { name: 'English' }));

        expect(onSelect).toHaveBeenCalledWith('en');
    });

    it('calls onSelect with null when "Off" is clicked', async () => {
        const onSelect = vi.fn();
        renderButton({ showMenu: true, activeTrack: 'en', onSelect });

        await userEvent.click(screen.getByRole('option', { name: 'Off' }));

        expect(onSelect).toHaveBeenCalledWith(null);
    });
});

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ui';
import PipButton from '@components/player/pipButton';

function renderButton(props: Partial<React.ComponentProps<typeof PipButton>> = {}) {
    return render(
        <TooltipProvider delayDuration={0}>
            <PipButton isActive={false} isSupported={true} onClick={vi.fn()} {...props} />
        </TooltipProvider>,
    );
}

describe('PipButton', () => {
    it('renders nothing when PiP is not supported', () => {
        renderButton({ isSupported: false });

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows the "enter pip" label when inactive', () => {
        renderButton({ isActive: false });

        expect(screen.getByRole('button', { name: 'Picture in picture' })).toBeInTheDocument();
    });

    it('shows the "exit pip" label when active', () => {
        renderButton({ isActive: true });

        expect(screen.getByRole('button', { name: 'Exit picture in picture' })).toBeInTheDocument();
        expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onClick when clicked', async () => {
        const onClick = vi.fn();
        renderButton({ onClick });

        await userEvent.click(screen.getByRole('button'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

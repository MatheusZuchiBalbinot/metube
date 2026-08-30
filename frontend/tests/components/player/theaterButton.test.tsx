// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ui';
import TheaterButton from '@components/player/theaterButton';

function renderButton(props: Partial<React.ComponentProps<typeof TheaterButton>> = {}) {
    return render(
        <TooltipProvider delayDuration={0}>
            <TheaterButton isTheater={false} onClick={vi.fn()} {...props} />
        </TooltipProvider>,
    );
}

describe('TheaterButton', () => {
    it('shows the "enter theater" label when not in theater mode', () => {
        renderButton({ isTheater: false });

        expect(screen.getByRole('button', { name: 'Theater mode' })).toBeInTheDocument();
        expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows the "exit theater" label when in theater mode', () => {
        renderButton({ isTheater: true });

        expect(screen.getByRole('button', { name: 'Exit theater mode' })).toBeInTheDocument();
        expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onClick when clicked', async () => {
        const onClick = vi.fn();
        renderButton({ onClick });

        await userEvent.click(screen.getByRole('button'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

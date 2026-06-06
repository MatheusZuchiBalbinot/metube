// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimestampedText from '@components/ui/timestamp/text';

describe('TimestampedText', () => {
    it('renders plain text when no onSeek is provided', () => {
        const { container } = render(<TimestampedText text="see 1:23 here" />);
        expect(container.querySelectorAll('button')).toHaveLength(0);
        expect(container.textContent).toBe('see 1:23 here');
    });

    it('turns m:ss and h:mm:ss timestamps into seek buttons', async () => {
        const onSeek = vi.fn();
        render(<TimestampedText text="intro 1:05 and 1:02:03 end" onSeek={onSeek} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons.map(b => b.textContent)).toEqual(['1:05', '1:02:03']);

        await userEvent.click(buttons[0]);
        expect(onSeek).toHaveBeenCalledWith(65);

        await userEvent.click(buttons[1]);
        expect(onSeek).toHaveBeenCalledWith(3723);
    });

    it('does not match plain digit runs', () => {
        const onSeek = vi.fn();
        render(<TimestampedText text="version 12345 build" onSeek={onSeek} />);
        expect(screen.queryByRole('button')).toBeNull();
    });
});

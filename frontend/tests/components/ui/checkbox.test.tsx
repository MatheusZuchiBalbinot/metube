// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Checkbox from '@ui/checkbox/checkbox';

describe('Checkbox', () => {
    it('renders a checkbox input', () => {
        render(<Checkbox checked={false} onChange={() => undefined} />);
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('is checked when checked=true', () => {
        render(<Checkbox checked={true} onChange={() => undefined} />);
        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('is not checked when checked=false', () => {
        render(<Checkbox checked={false} onChange={() => undefined} />);
        expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('calls onChange when clicked', async () => {
        const onChange = vi.fn();
        render(<Checkbox checked={false} onChange={onChange} />);
        await userEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('is disabled when disabled=true', () => {
        render(<Checkbox checked={false} onChange={() => undefined} disabled />);
        expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('applies custom className', () => {
        const { container } = render(
            <Checkbox checked={false} onChange={() => undefined} className="my-check" />,
        );
        expect(container.firstChild).toHaveClass('my-check');
    });
});

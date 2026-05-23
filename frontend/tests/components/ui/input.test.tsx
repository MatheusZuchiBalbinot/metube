// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '@ui/input/input';

describe('Input', () => {
    it('renders a text input', () => {
        render(<Input />);
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders label when provided', () => {
        render(<Input id="name" label="Full Name" />);
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    it('renders error message when error is provided', () => {
        render(<Input id="email" error="Required" />);
        expect(screen.getByRole('alert')).toHaveTextContent('Required');
    });

    it('marks input as aria-invalid when error is present', () => {
        render(<Input id="field" error="Bad value" />);
        expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('renders helper text when no error and helper is provided', () => {
        render(<Input helper="Enter your email" />);
        expect(screen.getByText('Enter your email')).toBeInTheDocument();
    });

    it('does not render helper text when error is present', () => {
        render(<Input id="f" error="Oops" helper="Helper text" />);
        expect(screen.queryByText('Helper text')).toBeNull();
    });

    it('calls onChange when user types', async () => {
        const onChange = vi.fn();
        render(<Input onChange={onChange} />);
        await userEvent.type(screen.getByRole('textbox'), 'abc');
        expect(onChange).toHaveBeenCalled();
    });

    it('is disabled when disabled prop is set', () => {
        render(<Input disabled />);
        expect(screen.getByRole('textbox')).toBeDisabled();
    });
});

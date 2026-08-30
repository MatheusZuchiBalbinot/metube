// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from '@ui/card/card';

describe('Card', () => {
    it('renders children', () => {
        render(<Card>Card content</Card>);
        expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies hover class when hover=true', () => {
        const { container } = render(<Card hover>Content</Card>);
        expect(container.firstChild).toHaveClass('card--hover');
    });

    it('applies correct padding class', () => {
        const { container } = render(<Card padding="lg">Content</Card>);
        expect(container.firstChild).toHaveClass('card--pad-lg');
    });

    it('applies custom className', () => {
        const { container } = render(<Card className="my-class">Content</Card>);
        expect(container.firstChild).toHaveClass('my-class');
    });

    it('calls onClick when clicked', async () => {
        const onClick = vi.fn();
        render(<Card onClick={onClick}>Clickable</Card>);
        await userEvent.click(screen.getByText('Clickable'));
        expect(onClick).toHaveBeenCalled();
    });

    it('calls onClick on Enter key press when interactive', async () => {
        const onClick = vi.fn();
        render(<Card onClick={onClick}>Clickable</Card>);
        screen.getByRole('button').focus();
        await userEvent.keyboard('{Enter}');
        expect(onClick).toHaveBeenCalled();
    });

    it('calls onClick on Space key press when interactive', async () => {
        const onClick = vi.fn();
        render(<Card onClick={onClick}>Clickable</Card>);
        screen.getByRole('button').focus();
        await userEvent.keyboard(' ');
        expect(onClick).toHaveBeenCalled();
    });

    it('does not call onClick on other key presses', async () => {
        const onClick = vi.fn();
        render(<Card onClick={onClick}>Clickable</Card>);
        screen.getByRole('button').focus();
        await userEvent.keyboard('{Escape}');
        expect(onClick).not.toHaveBeenCalled();
    });

    it('is not focusable/interactive when no onClick is provided', () => {
        render(<Card>Static</Card>);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});

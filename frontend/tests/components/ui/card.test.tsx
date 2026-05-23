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
});

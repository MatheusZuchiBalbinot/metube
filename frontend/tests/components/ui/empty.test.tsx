// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '@ui/empty/empty';

describe('EmptyState', () => {
    it('renders title', () => {
        render(<EmptyState icon={<span>📭</span>} title="Nothing here" />);
        expect(screen.getByText('Nothing here')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        render(
            <EmptyState icon={<span />} title="Empty" description="Try adding something." />,
        );
        expect(screen.getByText('Try adding something.')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
        render(<EmptyState icon={<span />} title="Empty" />);
        expect(screen.queryByText('Try')).toBeNull();
    });

    it('renders action button when actionLabel and onAction are provided', async () => {
        const onAction = vi.fn();
        render(
            <EmptyState
                icon={<span />}
                title="Empty"
                actionLabel="Create"
                onAction={onAction}
            />,
        );
        const btn = screen.getByRole('button', { name: 'Create' });
        await userEvent.click(btn);
        expect(onAction).toHaveBeenCalled();
    });

    it('does not render action button when actionLabel is missing', () => {
        render(<EmptyState icon={<span />} title="Empty" onAction={() => undefined} />);
        expect(screen.queryByRole('button')).toBeNull();
    });
});

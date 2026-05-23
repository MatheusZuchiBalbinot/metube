// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Skeleton from '@ui/skeleton/skeleton';

describe('Skeleton', () => {
    it('renders with base skeleton class', () => {
        const { container } = render(<Skeleton />);
        expect(container.firstChild).toHaveClass('skeleton');
    });

    it('applies circle class when circle=true', () => {
        const { container } = render(<Skeleton circle />);
        expect(container.firstChild).toHaveClass('skeleton--circle');
    });

    it('applies custom className', () => {
        const { container } = render(<Skeleton className="my-skel" />);
        expect(container.firstChild).toHaveClass('my-skel');
    });

    it('applies width and height styles', () => {
        const { container } = render(<Skeleton width={100} height="2rem" />);
        const el = container.firstChild as HTMLElement;
        expect(el.style.width).toBe('100px');
        expect(el.style.height).toBe('2rem');
    });

    it('has aria-hidden', () => {
        const { container } = render(<Skeleton />);
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });
});

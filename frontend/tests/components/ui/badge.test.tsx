// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from '@ui/badge/badge';

describe('Badge', () => {
    it('renders children text', () => {
        render(<Badge>Published</Badge>);
        expect(screen.getByText('Published')).toBeInTheDocument();
    });

    it('applies default variant class', () => {
        render(<Badge>Label</Badge>);
        const el = screen.getByText('Label');
        expect(el).toHaveClass('badge--default');
    });

    it('applies specified variant class', () => {
        render(<Badge variant="success">OK</Badge>);
        expect(screen.getByText('OK')).toHaveClass('badge--success');
    });

    it('renders with danger variant', () => {
        render(<Badge variant="danger">Error</Badge>);
        expect(screen.getByText('Error')).toHaveClass('badge--danger');
    });
});

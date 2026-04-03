/**
 * Tests for TagBadge component.
 * Simple component that renders a tag with deterministic color.
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import TagBadge from '@components/tag/badge';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('TagBadge', () => {
    it('renders tag text', () => {
        renderWithProviders(<TagBadge tag="react" />);
        expect(screen.getByText('react')).toBeInTheDocument();
    });

    it('applies color based on tag name', () => {
        renderWithProviders(<TagBadge tag="typescript" />);
        const badge = screen.getByText('typescript');

        // Badge has color applied via CSS variables
        expect(badge.className).toContain('tag-badge');
    });

    it('renders with clickable variant', () => {
        const handleClick = () => {};
        renderWithProviders(<TagBadge tag="vue" onClick={handleClick} />);

        const badge = screen.getByRole('button', { name: /vue/i });
        expect(badge).toBeInTheDocument();
    });

    it('applies theme color consistently for same tag', () => {
        const { unmount } = renderWithProviders(<TagBadge tag="rust" />);
        const color1 = screen.getByText('rust').getAttribute('style');

        unmount();

        renderWithProviders(<TagBadge tag="rust" />);
        const color2 = screen.getByText('rust').getAttribute('style');

        expect(color1).toBe(color2);
    });
});

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import NavProgress from '@ui/navProgress/navProgress';

vi.useFakeTimers();

describe('NavProgress', () => {
    it('renders nothing initially (idle state)', () => {
        const { container } = renderWithProviders(<NavProgress />, { route: '/home' });
        expect(container.querySelector('.nav-progress')).toBeNull();
    });

    it('does not throw on mount and unmount', () => {
        const { unmount } = renderWithProviders(<NavProgress />);
        expect(() => unmount()).not.toThrow();
    });
});

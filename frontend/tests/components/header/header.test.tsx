// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import AppHeader from '@components/header/header';
import { renderWithProviders } from '../../helpers/renderWithProviders';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

describe('AppHeader search sync', () => {
    it('reflects the URL query when landing on /search directly', () => {
        renderWithProviders(<AppHeader onToggleSidebar={() => {}} />, { route: '/search?q=puppies' });

        const input = screen.getByPlaceholderText('Search videos, channels, tags...') as HTMLInputElement;
        expect(input.value).toBe('puppies');
    });

    it('leaves the search box empty when /search has no query', () => {
        renderWithProviders(<AppHeader onToggleSidebar={() => {}} />, { route: '/search' });

        const input = screen.getByPlaceholderText('Search videos, channels, tags...') as HTMLInputElement;
        expect(input.value).toBe('');
    });

    it('does not read a "q" param from unrelated routes', () => {
        renderWithProviders(<AppHeader onToggleSidebar={() => {}} />, { route: '/?q=puppies' });

        const input = screen.getByPlaceholderText('Search videos, channels, tags...') as HTMLInputElement;
        expect(input.value).toBe('');
    });
});

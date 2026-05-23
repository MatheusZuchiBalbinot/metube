// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/renderWithProviders';
import NotFoundPage from '@pages/notFound/notFound';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, useNavigate: () => mockNavigate };
});

describe('NotFoundPage', () => {
    it('renders 404 title', () => {
        renderWithProviders(<NotFoundPage />);
        expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('renders not-found message', () => {
        renderWithProviders(<NotFoundPage />);
        expect(screen.getByText('This page does not exist.')).toBeInTheDocument();
    });

    it('renders go home button', () => {
        renderWithProviders(<NotFoundPage />);
        expect(screen.getByRole('button', { name: 'Go home' })).toBeInTheDocument();
    });

    it('navigates to home when button is clicked', async () => {
        renderWithProviders(<NotFoundPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Go home' }));
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });
});

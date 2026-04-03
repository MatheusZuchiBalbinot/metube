/**
 * Tests for Guard (ProtectedRoute) component.
 * Guards routes that require authentication.
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import Guard from '@components/guard/guard';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { makeUser } from '../helpers/factories';

const TestContent = () => <div>Protected Content</div>;

describe('Guard', () => {
    it('shows spinner when auth is loading', () => {
        renderWithProviders(<Guard><TestContent /></Guard>, {
            preloadedState: {
                auth: { user: null, loading: true, sessionError: null },
            },
        });

        // Spinner shows up as a div with spinner classes
        expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('redirects to login when user is not authenticated', () => {
        renderWithProviders(<Guard><TestContent /></Guard>, {
            preloadedState: {
                auth: { user: null, loading: false, sessionError: null },
            },
        });

        // MemoryRouter navigates, but we need to check the route changed
        // When no user, Navigate to /login happens
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('renders children when user is authenticated', () => {
        renderWithProviders(<Guard><TestContent /></Guard>, {
            preloadedState: {
                auth: { user: makeUser(), loading: false, sessionError: null },
            },
        });

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
});

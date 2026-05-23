// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/renderWithProviders';
import LoginPage from '@pages/login/login';
import { makeRootState, makeUser } from '../helpers/factories';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ state: null, pathname: '/login', search: '', hash: '' }),
        useSearchParams: () => [new URLSearchParams(), vi.fn()],
    };
});

vi.mock('@api/auth', () => ({
    auth: {
        getCsrfCookie: vi.fn().mockResolvedValue(undefined),
        login: vi.fn(),
        logout: vi.fn(),
        me: vi.fn(),
    },
}));

import { auth } from '@api/auth';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('LoginPage', () => {
    it('renders email and password inputs', () => {
        renderWithProviders(<LoginPage />, {
            preloadedState: makeRootState({ auth: { user: null, loading: false, sessionError: null } }),
        });
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
    });

    it('shows spinner when authLoading is true', () => {
        renderWithProviders(<LoginPage />, {
            preloadedState: makeRootState({ auth: { user: null, loading: true, sessionError: null } }),
        });
        expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('redirects when user is already logged in', () => {
        const { container } = renderWithProviders(<LoginPage />, {
            preloadedState: makeRootState({ auth: { user: makeUser(), loading: false, sessionError: null } }),
        });
        // Navigate component renders, container will be empty
        expect(container.querySelector('form')).toBeNull();
    });

    it('calls signIn with email and password on submit', async () => {
        vi.mocked(auth.login).mockResolvedValue({ user: makeUser() });
        renderWithProviders(<LoginPage />, {
            preloadedState: makeRootState({ auth: { user: null, loading: false, sessionError: null } }),
        });

        await userEvent.type(screen.getByRole('textbox'), 'user@example.com');
        await userEvent.type(document.querySelector('input[type="password"]')!, 'secret');
        await userEvent.click(screen.getByRole('button', { name: 'auth.sign_in' }));

        await waitFor(() => expect(auth.login).toHaveBeenCalledWith({
            email: 'user@example.com',
            password: 'secret',
        }));
    });

    it('shows error message when login fails', async () => {
        vi.mocked(auth.login).mockRejectedValue(new Error('Invalid credentials'));
        renderWithProviders(<LoginPage />, {
            preloadedState: makeRootState({ auth: { user: null, loading: false, sessionError: null } }),
        });

        await userEvent.type(screen.getByRole('textbox'), 'bad@example.com');
        await userEvent.type(document.querySelector('input[type="password"]')!, 'wrongpass');
        await userEvent.click(screen.getByRole('button', { name: 'auth.sign_in' }));

        await waitFor(() => expect(screen.getByText('auth.invalid_credentials')).toBeInTheDocument());
    });
});

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import ToastContainer from '@ui/toast/toast';
import { makeRootState } from '../../helpers/factories';
import type { Toast } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

function makeToast(overrides: Partial<Toast> = {}): Toast {
    return {
        id: 'toast-1',
        message: 'Hello world',
        type: ToastType.SUCCESS,
        ...overrides,
    };
}

describe('ToastContainer', () => {
    it('renders nothing when toast list is empty', () => {
        const { container } = renderWithProviders(<ToastContainer />);
        expect(container.querySelector('.toast')).toBeNull();
    });

    it('renders a toast message', () => {
        const state = makeRootState({ toast: { toasts: [makeToast()] } });
        renderWithProviders(<ToastContainer />, { preloadedState: state });
        expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders error toast with correct class', () => {
        const state = makeRootState({
            toast: { toasts: [makeToast({ type: ToastType.ERROR, message: 'Oops' })] },
        });
        renderWithProviders(<ToastContainer />, { preloadedState: state });
        const toast = screen.getByRole('alert');
        expect(toast).toHaveClass('toast--error');
    });

    it('renders info toast with correct class', () => {
        const state = makeRootState({
            toast: { toasts: [makeToast({ type: ToastType.INFO, message: 'Note' })] },
        });
        renderWithProviders(<ToastContainer />, { preloadedState: state });
        expect(screen.getByText('Note').closest('.toast')).toHaveClass('toast--info');
    });

    it('only marks error toasts with role=alert (success/info are announced politely)', () => {
        const state = makeRootState({
            toast: { toasts: [makeToast({ type: ToastType.INFO, message: 'Note' })] },
        });
        renderWithProviders(<ToastContainer />, { preloadedState: state });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('renders action button when action is provided', () => {
        const state = makeRootState({
            toast: {
                toasts: [makeToast({ action: { label: 'Undo', onClick: vi.fn() } })],
            },
        });
        renderWithProviders(<ToastContainer />, { preloadedState: state });
        expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    });

    it('calls action onClick and removes toast when action button is clicked', async () => {
        const actionClick = vi.fn();
        const state = makeRootState({
            toast: {
                toasts: [makeToast({ action: { label: 'Retry', onClick: actionClick } })],
            },
        });
        const { store } = renderWithProviders(<ToastContainer />, { preloadedState: state });
        await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
        expect(actionClick).toHaveBeenCalled();
        expect(store.getState().toast.toasts).toHaveLength(0);
    });

    it('removes toast when close button is clicked', async () => {
        const state = makeRootState({ toast: { toasts: [makeToast()] } });
        const { store } = renderWithProviders(<ToastContainer />, { preloadedState: state });
        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'common.close' }));
        });
        expect(store.getState().toast.toasts).toHaveLength(0);
    });

    it('renders a close button for each toast', () => {
        const state = makeRootState({ toast: { toasts: [makeToast()] } });
        renderWithProviders(<ToastContainer />, { preloadedState: state });
        expect(screen.getByRole('button', { name: 'common.close' })).toBeInTheDocument();
    });
});

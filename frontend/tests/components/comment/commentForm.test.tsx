// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentForm from '@components/comment/form';
import { renderWithProviders } from '../../helpers/renderWithProviders';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

describe('CommentForm', () => {
    it('renders a textarea', () => {
        renderWithProviders(<CommentForm onSubmit={vi.fn()} />);
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders the submit button', () => {
        renderWithProviders(<CommentForm onSubmit={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'comments.submit' })).toBeInTheDocument();
    });

    it('submit button is disabled when textarea is empty', () => {
        renderWithProviders(<CommentForm onSubmit={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'comments.submit' })).toBeDisabled();
    });

    it('submit button is enabled after typing', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CommentForm onSubmit={vi.fn()} />);

        await user.type(screen.getByRole('textbox'), 'Hello');

        expect(screen.getByRole('button', { name: 'comments.submit' })).toBeEnabled();
    });

    it('does not render cancel button when onCancel is not provided', () => {
        renderWithProviders(<CommentForm onSubmit={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'common.cancel' })).not.toBeInTheDocument();
    });

    it('renders cancel button when onCancel is provided', () => {
        renderWithProviders(<CommentForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'common.cancel' })).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        renderWithProviders(<CommentForm onSubmit={vi.fn()} onCancel={onCancel} />);

        await user.click(screen.getByRole('button', { name: 'common.cancel' }));

        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('calls onSubmit with trimmed content when submitted', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        renderWithProviders(<CommentForm onSubmit={onSubmit} />);

        await user.type(screen.getByRole('textbox'), '  Hello world  ');
        await user.click(screen.getByRole('button', { name: 'comments.submit' }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Hello world'));
    });

    it('clears textarea after successful submit', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        renderWithProviders(<CommentForm onSubmit={onSubmit} />);

        await user.type(screen.getByRole('textbox'), 'My comment');
        await user.click(screen.getByRole('button', { name: 'comments.submit' }));

        await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
    });

    it('uses custom placeholder when provided', () => {
        renderWithProviders(<CommentForm onSubmit={vi.fn()} placeholder="Write a reply..." />);
        expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });

    it('uses custom submit label when provided', () => {
        renderWithProviders(<CommentForm onSubmit={vi.fn()} submitLabel="Reply" />);
        expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
    });

    it('uses initialValue when provided', () => {
        renderWithProviders(<CommentForm onSubmit={vi.fn()} initialValue="Existing content" />);
        expect(screen.getByRole('textbox')).toHaveValue('Existing content');
    });
});

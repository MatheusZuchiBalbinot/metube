// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentItem from '@components/comment/item';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeComment, cuid, makeRootState } from '../../helpers/factories';
import type { Cuid } from '@models/comment';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => opts ? `${key}:${JSON.stringify(opts)}` : key, i18n: { language: 'en' } }),
}));

vi.mock('@utils/format', () => ({
    Format: { relativeDate: () => '2 days ago' },
}));

const noop = vi.fn().mockResolvedValue(undefined);

function renderItem(overrides = {}, authUuid?: string) {
    const comment = makeComment(overrides);
    const state = makeRootState({
        auth: {
            user: authUuid !== undefined
                ? { id: authUuid as unknown as ReturnType<typeof makeRootState>['auth']['user'] extends { id: infer T } ? T : never, uuid: authUuid, name: 'Me', email: 'me@example.com' }
                : null,
            loading: false,
            sessionError: null,
        },
    });

    renderWithProviders(
        <CommentItem
            comment={comment}
            loadingReplies={{}}
            onToggleLike={noop}
            onEdit={noop}
            onDelete={noop}
            onAddReply={noop}
            getReplies={() => []}
            onLoadReplies={noop}
        />,
        { preloadedState: state },
    );

    return comment;
}

describe('CommentItem', () => {
    it('renders the author name', () => {
        renderItem({ author: { uuid: 'u-1', name: 'Alice', avatar: '' } });
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('renders the comment content', () => {
        renderItem({ content: 'Hello everyone!' });
        expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    });

    it('renders the relative timestamp', () => {
        renderItem();
        expect(screen.getByText('2 days ago')).toBeInTheDocument();
    });

    it('renders the like button', () => {
        renderItem();
        expect(screen.getByRole('button', { name: 'comments.like' })).toBeInTheDocument();
    });

    it('like button has aria-pressed false when not liked', () => {
        renderItem({ isLiked: false });
        expect(screen.getByRole('button', { name: 'comments.like' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('like button has aria-pressed true when liked', () => {
        renderItem({ isLiked: true });
        expect(screen.getByRole('button', { name: 'comments.unlike' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows like count when greater than zero', () => {
        renderItem({ likesCount: 5 });
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('does not show like count when zero', () => {
        renderItem({ likesCount: 0 });
        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('renders reply button for top-level comments', () => {
        renderItem();
        expect(screen.getByRole('button', { name: /comments.reply/i })).toBeInTheDocument();
    });

    it('shows edit and delete buttons for own comments', () => {
        renderItem({ author: { uuid: 'u-owner', name: 'Owner', avatar: '' } }, 'u-owner');
        expect(screen.getByRole('button', { name: 'comments.edit' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'comments.delete' })).toBeInTheDocument();
    });

    it('hides edit and delete buttons for other users comments', () => {
        renderItem({ author: { uuid: 'u-other', name: 'Other', avatar: '' } }, 'u-mine');
        expect(screen.queryByRole('button', { name: 'comments.edit' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'comments.delete' })).not.toBeInTheDocument();
    });

    it('hides edit and delete buttons when not logged in', () => {
        renderItem({ author: { uuid: 'u-other', name: 'Other', avatar: '' } }, undefined);
        expect(screen.queryByRole('button', { name: 'comments.edit' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'comments.delete' })).not.toBeInTheDocument();
    });

    it('shows view replies toggle when comment has replies', () => {
        renderItem({ replyCount: 3 });
        expect(screen.getByRole('button', { name: /comments.view_replies/ })).toBeInTheDocument();
    });

    it('does not show view replies toggle when no replies', () => {
        renderItem({ replyCount: 0 });
        expect(screen.queryByRole('button', { name: /comments.view_replies/ })).not.toBeInTheDocument();
    });

    it('shows reply form when reply button is clicked', async () => {
        const user = userEvent.setup();
        renderItem();

        await user.click(screen.getByRole('button', { name: /comments.reply/i }));

        expect(screen.getByPlaceholderText('comments.reply_placeholder')).toBeInTheDocument();
    });

    it('shows edit form when edit button is clicked', async () => {
        const user = userEvent.setup();
        renderItem({ content: 'Original', author: { uuid: 'u-me', name: 'Me', avatar: '' } }, 'u-me');

        await user.click(screen.getByRole('button', { name: 'comments.edit' }));

        expect(screen.getByRole('textbox')).toHaveValue('Original');
    });

    it('calls onToggleLike when like button is clicked', async () => {
        const user = userEvent.setup();
        const onToggleLike = vi.fn().mockResolvedValue(undefined);
        const comment = makeComment({ id: cuid('c-like') });

        renderWithProviders(
            <CommentItem
                comment={comment}
                loadingReplies={{}}
                onToggleLike={onToggleLike}
                onEdit={noop}
                onDelete={noop}
                onAddReply={noop}
                getReplies={() => []}
                onLoadReplies={noop}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'comments.like' }));

        expect(onToggleLike).toHaveBeenCalledWith(cuid('c-like') as Cuid);
    });

    it('shows edit history trigger when isEdited is true', () => {
        renderItem({ isEdited: true });
        expect(screen.getByRole('button', { name: 'comments.view_history' })).toBeInTheDocument();
    });

    it('does not show edit history trigger when isEdited is false', () => {
        renderItem({ isEdited: false });
        expect(screen.queryByRole('button', { name: 'comments.view_history' })).not.toBeInTheDocument();
    });
});

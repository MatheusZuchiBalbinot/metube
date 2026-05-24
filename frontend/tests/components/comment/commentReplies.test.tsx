// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentReplies from '@components/comment/replies';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeComment, cuid, makeRootState } from '../../helpers/factories';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

vi.mock('@utils/time', () => ({
    formatRelativeDate: () => '1 hour ago',
}));

const noop = vi.fn().mockResolvedValue(undefined);
const parentCuid = cuid('c-parent');

describe('CommentReplies', () => {
    it('renders nothing when there are no replies', () => {
        const { container } = renderWithProviders(
            <CommentReplies
                parentCuid={parentCuid}
                getReplies={() => []}
                loadingReplies={{}}
                onToggleLike={noop}
                onEdit={noop}
                onDelete={noop}
                onAddReply={noop}
                onLoadReplies={noop}
            />,
        );
        expect(container.querySelector('.comment-replies')).toBeEmptyDOMElement();
    });

    it('renders all reply authors', () => {
        const replies = [
            makeComment({ id: cuid('r-1'), author: { uuid: 'u-1', name: 'Alice', avatar: '' } }),
            makeComment({ id: cuid('r-2'), author: { uuid: 'u-2', name: 'Bob', avatar: '' } }),
        ];

        renderWithProviders(
            <CommentReplies
                parentCuid={parentCuid}
                getReplies={() => replies}
                loadingReplies={{}}
                onToggleLike={noop}
                onEdit={noop}
                onDelete={noop}
                onAddReply={noop}
                onLoadReplies={noop}
            />,
        );

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('renders reply content', () => {
        const replies = [makeComment({ id: cuid('r-1'), content: 'Great point!' })];

        renderWithProviders(
            <CommentReplies
                parentCuid={parentCuid}
                getReplies={() => replies}
                loadingReplies={{}}
                onToggleLike={noop}
                onEdit={noop}
                onDelete={noop}
                onAddReply={noop}
                onLoadReplies={noop}
            />,
        );

        expect(screen.getByText('Great point!')).toBeInTheDocument();
    });

    it('shows like count when greater than zero', () => {
        const replies = [makeComment({ id: cuid('r-1'), likesCount: 7 })];

        renderWithProviders(
            <CommentReplies
                parentCuid={parentCuid}
                getReplies={() => replies}
                loadingReplies={{}}
                onToggleLike={noop}
                onEdit={noop}
                onDelete={noop}
                onAddReply={noop}
                onLoadReplies={noop}
            />,
        );

        expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('shows edit and delete buttons for own replies', () => {
        const ownerUuid = 'u-owner';
        const replies = [makeComment({ id: cuid('r-1'), author: { uuid: ownerUuid, name: 'Owner', avatar: '' } })];
        const state = makeRootState({
            auth: {
                user: { id: ownerUuid as unknown as ReturnType<typeof makeRootState>['auth']['user'] extends { id: infer T } ? T : never, uuid: ownerUuid, name: 'Owner', email: 'owner@example.com' },
                loading: false,
                sessionError: null,
            },
        });

        renderWithProviders(
            <CommentReplies
                parentCuid={parentCuid}
                getReplies={() => replies}
                loadingReplies={{}}
                onToggleLike={noop}
                onEdit={noop}
                onDelete={noop}
                onAddReply={noop}
                onLoadReplies={noop}
            />,
            { preloadedState: state },
        );

        expect(screen.getByRole('button', { name: 'comments.edit' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'comments.delete' })).toBeInTheDocument();
    });

    it('hides edit and delete buttons for other users replies', () => {
        const replies = [makeComment({ id: cuid('r-1'), author: { uuid: 'u-other', name: 'Other', avatar: '' } })];
        const state = makeRootState({
            auth: {
                user: { id: 'u-mine' as unknown as ReturnType<typeof makeRootState>['auth']['user'] extends { id: infer T } ? T : never, uuid: 'u-mine', name: 'Me', email: 'me@example.com' },
                loading: false,
                sessionError: null,
            },
        });

        renderWithProviders(
            <CommentReplies
                parentCuid={parentCuid}
                getReplies={() => replies}
                loadingReplies={{}}
                onToggleLike={noop}
                onEdit={noop}
                onDelete={noop}
                onAddReply={noop}
                onLoadReplies={noop}
            />,
            { preloadedState: state },
        );

        expect(screen.queryByRole('button', { name: 'comments.edit' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'comments.delete' })).not.toBeInTheDocument();
    });

    it('shows edit form when edit button is clicked', async () => {
        const user = userEvent.setup();
        const ownerUuid = 'u-owner';
        const replies = [makeComment({ id: cuid('r-1'), content: 'My reply', author: { uuid: ownerUuid, name: 'Owner', avatar: '' } })];
        const state = makeRootState({
            auth: {
                user: { id: ownerUuid as unknown as ReturnType<typeof makeRootState>['auth']['user'] extends { id: infer T } ? T : never, uuid: ownerUuid, name: 'Owner', email: 'owner@example.com' },
                loading: false,
                sessionError: null,
            },
        });

        renderWithProviders(
            <CommentReplies
                parentCuid={parentCuid}
                getReplies={() => replies}
                loadingReplies={{}}
                onToggleLike={noop}
                onEdit={noop}
                onDelete={noop}
                onAddReply={noop}
                onLoadReplies={noop}
            />,
            { preloadedState: state },
        );

        await user.click(screen.getByRole('button', { name: 'comments.edit' }));

        expect(screen.getByRole('textbox')).toHaveValue('My reply');
    });
});

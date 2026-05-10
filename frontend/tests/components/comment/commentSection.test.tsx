// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import CommentSection from '@components/comment/section';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeComment, cuid, makeRootState } from '../../helpers/factories';
import type { Vuid } from '@api/videos';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => opts ? `${key}:${JSON.stringify(opts)}` : key, i18n: { language: 'en' } }),
}));

vi.mock('@hooks/useComments', () => ({
    useComments: vi.fn(),
}));

import { useComments } from '@hooks/useComments';

const vuid = 'v-test' as unknown as Vuid;

function makeUseComments(overrides = {}) {
    return {
        comments: [],
        isLoading: false,
        pagination: undefined,
        load: vi.fn().mockResolvedValue(undefined),
        loadMore: vi.fn().mockResolvedValue(undefined),
        add: vi.fn().mockResolvedValue(undefined),
        edit: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        toggleLike: vi.fn().mockResolvedValue(undefined),
        loadReplies: vi.fn().mockResolvedValue(undefined),
        loadingReplies: {},
        getReplies: vi.fn().mockReturnValue([]),
        byId: {},
        ...overrides,
    };
}

describe('CommentSection', () => {
    beforeEach(() => {
        vi.mocked(useComments).mockReturnValue(makeUseComments());
    });

    it('shows spinner while loading before first successful load', () => {
        vi.mocked(useComments).mockReturnValue(makeUseComments({
            isLoading: true,
            pagination: undefined,
        }));

        renderWithProviders(<CommentSection vuid={vuid} />);

        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows empty state after load with no comments', () => {
        vi.mocked(useComments).mockReturnValue(makeUseComments({
            comments: [],
            isLoading: false,
            pagination: { currentPage: 1, lastPage: 1, total: 0 },
        }));

        renderWithProviders(<CommentSection vuid={vuid} />);

        expect(screen.getByText('comments.empty')).toBeInTheDocument();
    });

    it('renders list of comments after load', () => {
        const comments = [
            makeComment({ id: cuid('c-1'), content: 'First comment' }),
            makeComment({ id: cuid('c-2'), content: 'Second comment' }),
        ];

        vi.mocked(useComments).mockReturnValue(makeUseComments({
            comments,
            pagination: { currentPage: 1, lastPage: 1, total: 2 },
        }));

        renderWithProviders(<CommentSection vuid={vuid} />);

        expect(screen.getByText('First comment')).toBeInTheDocument();
        expect(screen.getByText('Second comment')).toBeInTheDocument();
    });

    it('shows load more button when there are more pages', () => {
        vi.mocked(useComments).mockReturnValue(makeUseComments({
            comments: [makeComment()],
            pagination: { currentPage: 1, lastPage: 3, total: 30 },
        }));

        renderWithProviders(<CommentSection vuid={vuid} />);

        expect(screen.getByRole('button', { name: 'comments.load_more' })).toBeInTheDocument();
    });

    it('does not show load more button on the last page', () => {
        vi.mocked(useComments).mockReturnValue(makeUseComments({
            comments: [makeComment()],
            pagination: { currentPage: 2, lastPage: 2, total: 20 },
        }));

        renderWithProviders(<CommentSection vuid={vuid} />);

        expect(screen.queryByRole('button', { name: 'comments.load_more' })).not.toBeInTheDocument();
    });

    it('renders the comment form', () => {
        vi.mocked(useComments).mockReturnValue(makeUseComments({
            pagination: { currentPage: 1, lastPage: 1, total: 0 },
        }));

        renderWithProviders(<CommentSection vuid={vuid} />);

        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('calls load(1) on mount', () => {
        const load = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useComments).mockReturnValue(makeUseComments({ load }));

        renderWithProviders(<CommentSection vuid={vuid} />);

        expect(load).toHaveBeenCalledWith(1);
    });

    it('does not show empty state while spinner is visible (no flash)', () => {
        vi.mocked(useComments).mockReturnValue(makeUseComments({
            isLoading: false,
            pagination: undefined,
            comments: [],
        }));

        renderWithProviders(<CommentSection vuid={vuid} />);

        expect(screen.queryByText('comments.empty')).not.toBeInTheDocument();
    });

    it('shows comment count in title', () => {
        vi.mocked(useComments).mockReturnValue(makeUseComments({
            comments: [makeComment()],
            pagination: { currentPage: 1, lastPage: 1, total: 42 },
        }));

        renderWithProviders(<CommentSection vuid={vuid} />);

        expect(screen.getByText(/comments.title/)).toBeInTheDocument();
    });

    it('renders comment section in loading state using makeRootState with comment slice', () => {
        const state = makeRootState({
            comment: {
                byId: {},
                byVideo: {},
                repliesById: {},
                pagination: {},
                loadingVideos: { 'v-test': true },
                loadingReplies: {},
                error: null,
            },
        });

        vi.mocked(useComments).mockReturnValue(makeUseComments({
            isLoading: true,
            pagination: undefined,
        }));

        renderWithProviders(<CommentSection vuid={vuid} />, { preloadedState: state });

        expect(screen.getByRole('status')).toBeInTheDocument();
    });
});

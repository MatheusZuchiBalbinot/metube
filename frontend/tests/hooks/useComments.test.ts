// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { useComments } from '@hooks/useComments';
import commentSlice from '@store/commentSlice';
import type { Cuid } from '@models/comment';
import type { Vuid } from '@api';
import { makeComment, cuid } from '../helpers/factories';

vi.mock('@api/comments', () => ({
    comments: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        toggleLike: vi.fn(),
        replies: vi.fn(),
    },
}));

import { comments as commentsApi } from '@api/comments';

const vuid = 'vAABBCCDDEFF' as unknown as Vuid;

const ok = <T>(data: T) => ({ ok: true as const, data });
const fail = () => ({ ok: false as const, error: 'fail' });

function makePaginatedResponse(data: ReturnType<typeof makeComment>[]) {
    return {
        data,
        meta: { page: 1, lastPage: 1, total: data.length },
    };
}

function makeStore() {
    return configureStore({ reducer: { comment: commentSlice.reducer } });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
            Provider,
            { store },
            React.createElement(MemoryRouter, null, children),
        );
    };
}

describe('useComments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('load', () => {
        it('fetches page 1 and sets comments in store', async () => {
            const comment = makeComment({ id: cuid('c-1') });
            vi.mocked(commentsApi.list).mockResolvedValue(ok(makePaginatedResponse([comment])));

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.load(1);
            });

            expect(result.current.comments).toHaveLength(1);
            expect(result.current.comments[0].id).toBe(cuid('c-1'));
        });

        it('appends comments when loading page 2', async () => {
            const c1 = makeComment({ id: cuid('c-1') });
            const c2 = makeComment({ id: cuid('c-2') });
            vi.mocked(commentsApi.list)
                .mockResolvedValueOnce(ok(makePaginatedResponse([c1])))
                .mockResolvedValueOnce(ok({ data: [c2], meta: { page: 2, lastPage: 2, total: 2 } }));

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.load(1);
            });
            await act(async () => {
                await result.current.load(2);
            });

            expect(result.current.comments).toHaveLength(2);
        });

        it('does not update store when API fails', async () => {
            vi.mocked(commentsApi.list).mockResolvedValue(fail());

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.load(1);
            });

            expect(result.current.comments).toHaveLength(0);
        });

        it('sets isLoading during fetch and clears it after', async () => {
            let resolveList!: (v: ReturnType<typeof ok<ReturnType<typeof makePaginatedResponse>>>) => void;
            vi.mocked(commentsApi.list).mockReturnValue(
                new Promise(res => {
                    resolveList = res;
                }),
            );

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            act(() => {
                void result.current.load(1);
            });
            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolveList(ok(makePaginatedResponse([])));
            });

            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('add', () => {
        it('adds a top-level comment to the store', async () => {
            const comment = makeComment({ id: cuid('c-new'), content: 'Hello!' });
            vi.mocked(commentsApi.create).mockResolvedValue(ok(comment));

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.add('Hello!');
            });

            expect(result.current.comments[0].content).toBe('Hello!');
        });

        it('does not add comment when API fails', async () => {
            vi.mocked(commentsApi.create).mockResolvedValue(fail());

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.add('Will fail');
            });

            expect(result.current.comments).toHaveLength(0);
        });
    });

    describe('edit', () => {
        it('updates comment content in the store', async () => {
            const original = makeComment({ id: cuid('c-edit'), content: 'Old' });
            vi.mocked(commentsApi.list).mockResolvedValue(ok(makePaginatedResponse([original])));
            const updated = makeComment({ id: cuid('c-edit'), content: 'New' });
            vi.mocked(commentsApi.update).mockResolvedValue(ok(updated));

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.load(1);
            });
            await act(async () => {
                await result.current.edit(cuid('c-edit') as Cuid, 'New');
            });

            expect(result.current.comments[0].content).toBe('New');
        });
    });

    describe('remove', () => {
        it('removes the comment from the store', async () => {
            const comment = makeComment({ id: cuid('c-del') });
            vi.mocked(commentsApi.list).mockResolvedValue(ok(makePaginatedResponse([comment])));
            vi.mocked(commentsApi.delete).mockResolvedValue(ok(undefined));

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.load(1);
            });
            await act(async () => {
                await result.current.remove(cuid('c-del') as Cuid);
            });

            expect(result.current.comments).toHaveLength(0);
        });
    });

    describe('toggleLike', () => {
        it('optimistically toggles like and updates from server', async () => {
            const comment = makeComment({ id: cuid('c-like'), isLiked: false, likesCount: 0 });
            vi.mocked(commentsApi.list).mockResolvedValue(ok(makePaginatedResponse([comment])));
            vi.mocked(commentsApi.toggleLike).mockResolvedValue(ok({ liked: true, likesCount: 1 }));

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.load(1);
            });
            await act(async () => {
                await result.current.toggleLike(cuid('c-like') as Cuid);
            });

            expect(result.current.comments[0].isLiked).toBe(true);
        });

        it('rolls back optimistic like on API failure', async () => {
            const comment = makeComment({ id: cuid('c-rb'), isLiked: false, likesCount: 0 });
            vi.mocked(commentsApi.list).mockResolvedValue(ok(makePaginatedResponse([comment])));
            vi.mocked(commentsApi.toggleLike).mockResolvedValue(fail());

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.load(1);
            });
            await act(async () => {
                await result.current.toggleLike(cuid('c-rb') as Cuid);
            });

            expect(result.current.comments[0].isLiked).toBe(false);
        });
    });

    describe('add (reply)', () => {
        it('dispatches addReply when parentCuid is provided', async () => {
            const reply = makeComment({ id: cuid('c-reply'), content: 'reply!' });
            vi.mocked(commentsApi.create).mockResolvedValue(ok(reply));

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.add('reply!', cuid('c-parent') as Cuid);
            });

            const replies = result.current.getReplies(cuid('c-parent') as Cuid);
            expect(replies).toHaveLength(1);
            expect(replies[0].content).toBe('reply!');
        });
    });

    describe('loadReplies', () => {
        it('fetches and stores replies for a parent comment', async () => {
            const reply = makeComment({ id: cuid('c-r1') });
            vi.mocked(commentsApi.replies).mockResolvedValue(ok([reply]));

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.loadReplies(cuid('c-parent2') as Cuid);
            });

            expect(result.current.getReplies(cuid('c-parent2') as Cuid)).toHaveLength(1);
        });

        it('does not store replies when API fails', async () => {
            vi.mocked(commentsApi.replies).mockResolvedValue(fail());

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.loadReplies(cuid('c-noop') as Cuid);
            });

            expect(result.current.getReplies(cuid('c-noop') as Cuid)).toHaveLength(0);
        });
    });

    describe('loadMore', () => {
        it('loads the next page based on pagination state', async () => {
            const c1 = makeComment({ id: cuid('c-1') });
            const c2 = makeComment({ id: cuid('c-2') });
            vi.mocked(commentsApi.list)
                .mockResolvedValueOnce(ok({ data: [c1], meta: { page: 1, lastPage: 3, total: 3 } }))
                .mockResolvedValueOnce(ok({ data: [c2], meta: { page: 2, lastPage: 3, total: 3 } }));

            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.load(1);
            });
            await act(async () => {
                await result.current.loadMore();
            });

            expect(result.current.comments).toHaveLength(2);
            expect(vi.mocked(commentsApi.list)).toHaveBeenLastCalledWith(vuid, { page: 2 });
        });
    });

    describe('remove (reply)', () => {
        it('calls the API and dispatches removeComment with parentCuid', async () => {
            vi.mocked(commentsApi.delete).mockResolvedValue(ok(undefined));
            const store = makeStore();
            const { result } = renderHook(() => useComments(vuid), { wrapper: makeWrapper(store) });

            await act(async () => {
                await result.current.remove(cuid('c-r') as Cuid, cuid('c-parent') as Cuid);
            });

            expect(commentsApi.delete).toHaveBeenCalledWith(cuid('c-r'));
        });
    });
});

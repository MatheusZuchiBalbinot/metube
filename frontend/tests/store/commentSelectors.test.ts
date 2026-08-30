// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { commentActions } from '@store/commentSlice';
import {
    selectCommentById,
    selectCommentsByVideo,
    selectCommentRepliesById,
    selectCommentPagination,
    selectCommentLoadingVideos,
    selectCommentLoadingReplies,
    selectCommentError,
    selectCommentIdsForVideo,
    selectCommentPaginationForVideo,
    selectCommentLoadingForVideo,
    selectCommentLoadingRepliesForComment,
} from '@store/commentSelectors';
import { makeComment, cuid } from '../helpers/factories';
import type { Vuid, Cuid } from '@api';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

const vuid = (s: string) => s as unknown as Vuid;

describe('commentSelectors', () => {
    it('starts empty across every slice of comment state', () => {
        const store = makeStore();

        expect(selectCommentById(store.getState())).toEqual({});
        expect(selectCommentsByVideo(store.getState())).toEqual({});
        expect(selectCommentRepliesById(store.getState())).toEqual({});
        expect(selectCommentPagination(store.getState())).toEqual({});
        expect(selectCommentLoadingVideos(store.getState())).toEqual({});
        expect(selectCommentLoadingReplies(store.getState())).toEqual({});
        expect(selectCommentError(store.getState())).toBeNull();
    });

    it('reflects comments set for a video', () => {
        const store = makeStore();
        const c = makeComment({ id: cuid('c1') });
        const pagination = { currentPage: 1, lastPage: 1, total: 1 };

        store.dispatch(commentActions.setComments({ vuid: vuid('v1'), comments: [c], pagination }));

        expect(selectCommentById(store.getState())[cuid('c1')]).toEqual(c);
        expect(selectCommentIdsForVideo(vuid('v1'))(store.getState())).toEqual([cuid('c1')]);
        expect(selectCommentPaginationForVideo(vuid('v1'))(store.getState())).toEqual(pagination);
    });

    it('selectCommentIdsForVideo defaults to an empty array for an unknown video', () => {
        const store = makeStore();
        expect(selectCommentIdsForVideo(vuid('unknown'))(store.getState())).toEqual([]);
    });

    it('selectCommentLoadingForVideo defaults to false and reflects setLoading', () => {
        const store = makeStore();
        expect(selectCommentLoadingForVideo(vuid('v1'))(store.getState())).toBe(false);

        store.dispatch(commentActions.setLoading({ vuid: vuid('v1'), loading: true }));
        expect(selectCommentLoadingForVideo(vuid('v1'))(store.getState())).toBe(true);
    });

    it('selectCommentLoadingRepliesForComment defaults to false and reflects setLoadingReplies', () => {
        const store = makeStore();
        const c: Cuid = cuid('c1');
        expect(selectCommentLoadingRepliesForComment(c)(store.getState())).toBe(false);

        store.dispatch(commentActions.setLoadingReplies({ cuid: c, loading: true }));
        expect(selectCommentLoadingRepliesForComment(c)(store.getState())).toBe(true);
    });
});

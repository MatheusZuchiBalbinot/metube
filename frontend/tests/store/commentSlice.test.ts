// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import commentSlice, { commentActions } from '@store/commentSlice';
import type { CommentState } from '@store/commentSlice';
import type { Comment, Cuid } from '@models/comment';
import type { Vuid } from '@api/videos';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reducer = commentSlice.reducer;

function cuid(val: string): Cuid {
    return val as unknown as Cuid;
}

function vuid(val: string): Vuid {
    return val as unknown as Vuid;
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
    return {
        id: cuid('c-test'),
        content: 'Test comment',
        author: { uuid: 'u-1', name: 'Alice', avatar: '' },
        createdAt: '2024-01-01T00:00:00Z',
        likesCount: 0,
        isLiked: false,
        replyCount: 0,
        ...overrides,
    };
}

function makeState(overrides: Partial<CommentState> = {}): CommentState {
    return {
        byId: {},
        byVideo: {},
        repliesById: {},
        pagination: {},
        loadingVideos: {},
        loadingReplies: {},
        error: null,
        ...overrides,
    };
}

const pagination = { currentPage: 1, lastPage: 1, total: 2 };

// ─── setLoading ───────────────────────────────────────────────────────────────

describe('commentSlice — setLoading', () => {
    it('sets loading true for a vuid', () => {
        const state = makeState();
        const next = reducer(state, commentActions.setLoading({ vuid: vuid('v-1'), loading: true }));
        expect(next.loadingVideos['v-1']).toBe(true);
    });

    it('sets loading false for a vuid', () => {
        const state = makeState({ loadingVideos: { 'v-1': true } });
        const next = reducer(state, commentActions.setLoading({ vuid: vuid('v-1'), loading: false }));
        expect(next.loadingVideos['v-1']).toBe(false);
    });
});

// ─── setLoadingReplies ────────────────────────────────────────────────────────

describe('commentSlice — setLoadingReplies', () => {
    it('sets loading true for a cuid', () => {
        const state = makeState();
        const next = reducer(state, commentActions.setLoadingReplies({ cuid: cuid('c-1'), loading: true }));
        expect(next.loadingReplies['c-1']).toBe(true);
    });
});

// ─── setComments ─────────────────────────────────────────────────────────────

describe('commentSlice — setComments', () => {
    it('stores comments in byId', () => {
        const state = makeState();
        const c1 = makeComment({ id: cuid('c-1') });
        const c2 = makeComment({ id: cuid('c-2') });
        const next = reducer(state, commentActions.setComments({ vuid: vuid('v-1'), comments: [c1, c2], pagination }));
        expect(next.byId['c-1']).toEqual(c1);
        expect(next.byId['c-2']).toEqual(c2);
    });

    it('stores comment ids in byVideo', () => {
        const state = makeState();
        const c1 = makeComment({ id: cuid('c-1') });
        const next = reducer(state, commentActions.setComments({ vuid: vuid('v-1'), comments: [c1], pagination }));
        expect(next.byVideo['v-1']).toEqual(['c-1']);
    });

    it('replaces existing comments for the same vuid', () => {
        const c1 = makeComment({ id: cuid('c-1') });
        const c2 = makeComment({ id: cuid('c-2') });
        const state = makeState({ byVideo: { 'v-1': ['c-1'] }, byId: { 'c-1': c1 } });
        const next = reducer(state, commentActions.setComments({ vuid: vuid('v-1'), comments: [c2], pagination }));
        expect(next.byVideo['v-1']).toEqual(['c-2']);
    });

    it('stores pagination', () => {
        const state = makeState();
        const next = reducer(state, commentActions.setComments({ vuid: vuid('v-1'), comments: [], pagination }));
        expect(next.pagination['v-1']).toEqual(pagination);
    });
});

// ─── appendComments ───────────────────────────────────────────────────────────

describe('commentSlice — appendComments', () => {
    it('appends new comments to existing list', () => {
        const c1 = makeComment({ id: cuid('c-1') });
        const c2 = makeComment({ id: cuid('c-2') });
        const state = makeState({ byVideo: { 'v-1': ['c-1'] }, byId: { 'c-1': c1 } });
        const next = reducer(state, commentActions.appendComments({ vuid: vuid('v-1'), comments: [c2], pagination }));
        expect(next.byVideo['v-1']).toEqual(['c-1', 'c-2']);
    });

    it('starts a new list when byVideo is empty', () => {
        const c1 = makeComment({ id: cuid('c-1') });
        const state = makeState();
        const next = reducer(state, commentActions.appendComments({ vuid: vuid('v-1'), comments: [c1], pagination }));
        expect(next.byVideo['v-1']).toEqual(['c-1']);
    });
});

// ─── addComment ───────────────────────────────────────────────────────────────

describe('commentSlice — addComment', () => {
    it('prepends the new comment to byVideo', () => {
        const c1 = makeComment({ id: cuid('c-1') });
        const c2 = makeComment({ id: cuid('c-2') });
        const state = makeState({ byVideo: { 'v-1': ['c-1'] }, byId: { 'c-1': c1 } });
        const next = reducer(state, commentActions.addComment({ vuid: vuid('v-1'), comment: c2 }));
        expect(next.byVideo['v-1']).toEqual(['c-2', 'c-1']);
    });

    it('stores the comment in byId', () => {
        const c1 = makeComment({ id: cuid('c-1') });
        const state = makeState();
        const next = reducer(state, commentActions.addComment({ vuid: vuid('v-1'), comment: c1 }));
        expect(next.byId['c-1']).toEqual(c1);
    });
});

// ─── addReply ─────────────────────────────────────────────────────────────────

describe('commentSlice — addReply', () => {
    it('appends reply id to repliesById', () => {
        const parent = makeComment({ id: cuid('c-parent'), replyCount: 0 });
        const reply = makeComment({ id: cuid('c-reply') });
        const state = makeState({ byId: { 'c-parent': parent } });
        const next = reducer(state, commentActions.addReply({ parentCuid: cuid('c-parent'), comment: reply }));
        expect(next.repliesById['c-parent']).toEqual(['c-reply']);
    });

    it('increments replyCount on the parent', () => {
        const parent = makeComment({ id: cuid('c-parent'), replyCount: 2 });
        const reply = makeComment({ id: cuid('c-reply') });
        const state = makeState({ byId: { 'c-parent': parent } });
        const next = reducer(state, commentActions.addReply({ parentCuid: cuid('c-parent'), comment: reply }));
        expect(next.byId['c-parent']?.replyCount).toBe(3);
    });
});

// ─── setReplies ───────────────────────────────────────────────────────────────

describe('commentSlice — setReplies', () => {
    it('stores reply ids in repliesById', () => {
        const r1 = makeComment({ id: cuid('r-1') });
        const r2 = makeComment({ id: cuid('r-2') });
        const state = makeState();
        const next = reducer(state, commentActions.setReplies({ parentCuid: cuid('c-parent'), comments: [r1, r2] }));
        expect(next.repliesById['c-parent']).toEqual(['r-1', 'r-2']);
    });

    it('stores replies in byId', () => {
        const r1 = makeComment({ id: cuid('r-1') });
        const state = makeState();
        const next = reducer(state, commentActions.setReplies({ parentCuid: cuid('c-parent'), comments: [r1] }));
        expect(next.byId['r-1']).toEqual(r1);
    });
});

// ─── updateComment ────────────────────────────────────────────────────────────

describe('commentSlice — updateComment', () => {
    it('replaces the comment in byId', () => {
        const original = makeComment({ id: cuid('c-1'), content: 'Old' });
        const updated = makeComment({ id: cuid('c-1'), content: 'New' });
        const state = makeState({ byId: { 'c-1': original } });
        const next = reducer(state, commentActions.updateComment(updated));
        expect(next.byId['c-1']?.content).toBe('New');
    });

    it('does nothing when comment not found', () => {
        const updated = makeComment({ id: cuid('c-99'), content: 'Ghost' });
        const state = makeState();
        const next = reducer(state, commentActions.updateComment(updated));
        expect(next.byId['c-99']).toBeUndefined();
    });
});

// ─── removeComment ────────────────────────────────────────────────────────────

describe('commentSlice — removeComment', () => {
    it('removes the comment from byId', () => {
        const c1 = makeComment({ id: cuid('c-1') });
        const state = makeState({ byId: { 'c-1': c1 } });
        const next = reducer(state, commentActions.removeComment({ cuid: cuid('c-1') }));
        expect(next.byId['c-1']).toBeUndefined();
    });

    it('removes the comment id from byVideo', () => {
        const c1 = makeComment({ id: cuid('c-1') });
        const state = makeState({ byId: { 'c-1': c1 }, byVideo: { 'v-1': ['c-1', 'c-2'] } });
        const next = reducer(state, commentActions.removeComment({ cuid: cuid('c-1'), vuid: vuid('v-1') }));
        expect(next.byVideo['v-1']).toEqual(['c-2']);
    });

    it('removes the reply id from repliesById and decrements parent replyCount', () => {
        const parent = makeComment({ id: cuid('c-parent'), replyCount: 2 });
        const reply = makeComment({ id: cuid('c-reply') });
        const state = makeState({
            byId: { 'c-parent': parent, 'c-reply': reply },
            repliesById: { 'c-parent': ['c-reply', 'c-other'] },
        });
        const next = reducer(state, commentActions.removeComment({
            cuid: cuid('c-reply'),
            parentCuid: cuid('c-parent'),
        }));
        expect(next.repliesById['c-parent']).toEqual(['c-other']);
        expect(next.byId['c-parent']?.replyCount).toBe(1);
    });

    it('does not let replyCount go below 0', () => {
        const parent = makeComment({ id: cuid('c-parent'), replyCount: 0 });
        const reply = makeComment({ id: cuid('c-reply') });
        const state = makeState({
            byId: { 'c-parent': parent, 'c-reply': reply },
            repliesById: { 'c-parent': ['c-reply'] },
        });
        const next = reducer(state, commentActions.removeComment({
            cuid: cuid('c-reply'),
            parentCuid: cuid('c-parent'),
        }));
        expect(next.byId['c-parent']?.replyCount).toBe(0);
    });
});

// ─── toggleLikeOptimistic ─────────────────────────────────────────────────────

describe('commentSlice — toggleLikeOptimistic', () => {
    it('toggles isLiked from false to true and increments likesCount', () => {
        const c1 = makeComment({ id: cuid('c-1'), isLiked: false, likesCount: 5 });
        const state = makeState({ byId: { 'c-1': c1 } });
        const next = reducer(state, commentActions.toggleLikeOptimistic(cuid('c-1')));
        expect(next.byId['c-1']?.isLiked).toBe(true);
        expect(next.byId['c-1']?.likesCount).toBe(6);
    });

    it('toggles isLiked from true to false and decrements likesCount', () => {
        const c1 = makeComment({ id: cuid('c-1'), isLiked: true, likesCount: 3 });
        const state = makeState({ byId: { 'c-1': c1 } });
        const next = reducer(state, commentActions.toggleLikeOptimistic(cuid('c-1')));
        expect(next.byId['c-1']?.isLiked).toBe(false);
        expect(next.byId['c-1']?.likesCount).toBe(2);
    });

    it('does nothing when comment not found', () => {
        const state = makeState();
        const next = reducer(state, commentActions.toggleLikeOptimistic(cuid('c-99')));
        expect(next.byId['c-99']).toBeUndefined();
    });
});

// ─── setError ────────────────────────────────────────────────────────────────

describe('commentSlice — setError', () => {
    it('stores an error message', () => {
        const state = makeState();
        const next = reducer(state, commentActions.setError('Something went wrong'));
        expect(next.error).toBe('Something went wrong');
    });

    it('clears the error when null is passed', () => {
        const state = makeState({ error: 'Old error' });
        const next = reducer(state, commentActions.setError(null));
        expect(next.error).toBeNull();
    });
});

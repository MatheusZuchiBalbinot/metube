import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Comment } from '@models';
import type { Cuid, Vuid } from '@api';

export interface CommentPagination {
    currentPage: number
    lastPage: number
    total: number
}

export interface CommentState {
    byId: Record<Cuid, Comment>
    byVideo: Record<Vuid, Cuid[]>
    repliesById: Record<Cuid, Cuid[]>
    pagination: Record<Vuid, CommentPagination>
    loadingVideos: Record<Vuid, boolean>
    loadingReplies: Record<Cuid, boolean>
    error: string | null
}

const initialState: CommentState = {
    byId: {},
    byVideo: {},
    repliesById: {},
    pagination: {},
    loadingVideos: {},
    loadingReplies: {},
    error: null,
};

const commentSlice = createSlice({
    name: 'comment',
    initialState,
    reducers: {
        setLoading(state, action: PayloadAction<{ vuid: Vuid; loading: boolean }>) {
            state.loadingVideos[action.payload.vuid] = action.payload.loading;
        },

        setLoadingReplies(state, action: PayloadAction<{ cuid: Cuid; loading: boolean }>) {
            state.loadingReplies[action.payload.cuid] = action.payload.loading;
        },

        setComments(
            state,
            action: PayloadAction<{ vuid: Vuid; comments: Comment[]; pagination: CommentPagination }>,
        ) {
            const { vuid, comments, pagination } = action.payload;

            comments.forEach(c => {
                state.byId[c.id] = c;
            });

            state.byVideo[vuid] = comments.map(c => c.id);
            state.pagination[vuid] = pagination;
        },

        appendComments(
            state,
            action: PayloadAction<{ vuid: Vuid; comments: Comment[]; pagination: CommentPagination }>,
        ) {
            const { vuid, comments, pagination } = action.payload;

            comments.forEach(c => {
                state.byId[c.id] = c;
            });

            const existing = state.byVideo[vuid] ?? [];
            state.byVideo[vuid] = [...existing, ...comments.map(c => c.id)];
            state.pagination[vuid] = pagination;
        },

        addComment(state, action: PayloadAction<{ vuid: Vuid; comment: Comment }>) {
            const { vuid, comment } = action.payload;

            state.byId[comment.id] = comment;

            const existing = state.byVideo[vuid] ?? [];
            state.byVideo[vuid] = [comment.id, ...existing];

            if (state.pagination[vuid] !== undefined) {
                state.pagination[vuid].total += 1;
            }
        },

        addReply(state, action: PayloadAction<{ parentCuid: Cuid; comment: Comment }>) {
            const { parentCuid, comment } = action.payload;

            state.byId[comment.id] = comment;

            const existing = state.repliesById[parentCuid] ?? [];
            state.repliesById[parentCuid] = [...existing, comment.id];

            const parent = state.byId[parentCuid];

            if (parent !== undefined) {
                parent.replyCount += 1;
            }
        },

        setReplies(state, action: PayloadAction<{ parentCuid: Cuid; comments: Comment[] }>) {
            const { parentCuid, comments } = action.payload;

            comments.forEach(c => {
                state.byId[c.id] = c;
            });

            state.repliesById[parentCuid] = comments.map(c => c.id);
        },

        updateComment(state, action: PayloadAction<Comment>) {
            const existing = state.byId[action.payload.id];

            if (existing !== undefined) {
                state.byId[action.payload.id] = action.payload;
            }
        },

        removeComment(
            state,
            action: PayloadAction<{ cuid: Cuid; vuid?: Vuid; parentCuid?: Cuid }>,
        ) {
            const { cuid, vuid, parentCuid } = action.payload;

            delete state.byId[cuid];

            if (vuid !== undefined) {
                state.byVideo[vuid] = (state.byVideo[vuid] ?? []).filter(id => id !== cuid);

                if (state.pagination[vuid] !== undefined) {
                    state.pagination[vuid].total = Math.max(0, state.pagination[vuid].total - 1);
                }
            }

            if (parentCuid !== undefined) {
                state.repliesById[parentCuid] = (state.repliesById[parentCuid] ?? []).filter(id => id !== cuid);

                const parent = state.byId[parentCuid];

                if (parent !== undefined) {
                    parent.replyCount = Math.max(0, parent.replyCount - 1);
                }
            }
        },

        toggleLikeOptimistic(state, action: PayloadAction<Cuid>) {
            const comment = state.byId[action.payload];

            if (comment === undefined) {
                return;
            }

            comment.isLiked = !comment.isLiked;
            comment.likesCount = comment.isLiked ? comment.likesCount + 1 : comment.likesCount - 1;
        },

        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
    },
});

export const commentActions = commentSlice.actions;
export default commentSlice;

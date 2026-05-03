import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Comment } from '@models/comment';
import type { Cuid } from '@api/comments';
import type { Vuid } from '@api/videos';

export interface CommentPagination {
    currentPage: number
    lastPage: number
    total: number
}

export interface CommentState {
    byId: Record<string, Comment>
    byVideo: Record<string, string[]>
    repliesById: Record<string, string[]>
    pagination: Record<string, CommentPagination>
    loadingVideos: Record<string, boolean>
    loadingReplies: Record<string, boolean>
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
            state.loadingVideos[action.payload.vuid as string] = action.payload.loading;
        },

        setLoadingReplies(state, action: PayloadAction<{ cuid: Cuid; loading: boolean }>) {
            state.loadingReplies[action.payload.cuid as string] = action.payload.loading;
        },

        setComments(
            state,
            action: PayloadAction<{ vuid: Vuid; comments: Comment[]; pagination: CommentPagination }>,
        ) {
            const { vuid, comments, pagination } = action.payload;

            comments.forEach(c => {
                state.byId[c.id as string] = c;
            });

            state.byVideo[vuid as string] = comments.map(c => c.id as string);
            state.pagination[vuid as string] = pagination;
        },

        appendComments(
            state,
            action: PayloadAction<{ vuid: Vuid; comments: Comment[]; pagination: CommentPagination }>,
        ) {
            const { vuid, comments, pagination } = action.payload;
            const vuidKey = vuid as string;

            comments.forEach(c => {
                state.byId[c.id as string] = c;
            });

            const existing = state.byVideo[vuidKey] ?? [];
            const newIds = comments.map(c => c.id as string);
            state.byVideo[vuidKey] = [...existing, ...newIds];
            state.pagination[vuidKey] = pagination;
        },

        addComment(state, action: PayloadAction<{ vuid: Vuid; comment: Comment }>) {
            const { vuid, comment } = action.payload;
            const cuidKey = comment.id as string;
            const vuidKey = vuid as string;

            state.byId[cuidKey] = comment;

            const existing = state.byVideo[vuidKey] ?? [];
            state.byVideo[vuidKey] = [cuidKey, ...existing];
        },

        addReply(state, action: PayloadAction<{ parentCuid: Cuid; comment: Comment }>) {
            const { parentCuid, comment } = action.payload;
            const cuidKey = comment.id as string;
            const parentKey = parentCuid as string;

            state.byId[cuidKey] = comment;

            const existing = state.repliesById[parentKey] ?? [];
            state.repliesById[parentKey] = [...existing, cuidKey];

            const parent = state.byId[parentKey];

            if (parent !== undefined) {
                parent.replyCount += 1;
            }
        },

        setReplies(state, action: PayloadAction<{ parentCuid: Cuid; comments: Comment[] }>) {
            const { parentCuid, comments } = action.payload;
            const parentKey = parentCuid as string;

            comments.forEach(c => {
                state.byId[c.id as string] = c;
            });

            state.repliesById[parentKey] = comments.map(c => c.id as string);
        },

        updateComment(state, action: PayloadAction<Comment>) {
            const cuidKey = action.payload.id as string;
            const existing = state.byId[cuidKey];

            if (existing !== undefined) {
                state.byId[cuidKey] = action.payload;
            }
        },

        removeComment(
            state,
            action: PayloadAction<{ cuid: Cuid; vuid?: Vuid; parentCuid?: Cuid }>,
        ) {
            const { cuid, vuid, parentCuid } = action.payload;
            const cuidKey = cuid as string;

            delete state.byId[cuidKey];

            if (vuid !== undefined) {
                const vuidKey = vuid as string;
                state.byVideo[vuidKey] = (state.byVideo[vuidKey] ?? []).filter(id => id !== cuidKey);
            }

            if (parentCuid !== undefined) {
                const parentKey = parentCuid as string;
                state.repliesById[parentKey] = (state.repliesById[parentKey] ?? []).filter(id => id !== cuidKey);

                const parent = state.byId[parentKey];

                if (parent !== undefined) {
                    parent.replyCount = Math.max(0, parent.replyCount - 1);
                }
            }
        },

        toggleLikeOptimistic(state, action: PayloadAction<Cuid>) {
            const comment = state.byId[action.payload as string];

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

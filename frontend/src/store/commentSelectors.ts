import type { RootState } from './types';
import type { Cuid, Vuid } from '@api';

export const selectCommentById = (state: RootState) => state.comment.byId;
export const selectCommentsByVideo = (state: RootState) => state.comment.byVideo;
export const selectCommentRepliesById = (state: RootState) => state.comment.repliesById;
export const selectCommentPagination = (state: RootState) => state.comment.pagination;
export const selectCommentLoadingVideos = (state: RootState) => state.comment.loadingVideos;
export const selectCommentLoadingReplies = (state: RootState) => state.comment.loadingReplies;
export const selectCommentError = (state: RootState) => state.comment.error;

export const selectCommentIdsForVideo = (vuid: Vuid) =>
    (state: RootState) => state.comment.byVideo[vuid] ?? ([] as Cuid[]);

export const selectCommentPaginationForVideo = (vuid: Vuid) =>
    (state: RootState) => state.comment.pagination[vuid];

export const selectCommentLoadingForVideo = (vuid: Vuid) =>
    (state: RootState) => state.comment.loadingVideos[vuid] ?? false;

export const selectCommentLoadingRepliesForComment = (cuid: Cuid) =>
    (state: RootState) => state.comment.loadingReplies[cuid] ?? false;

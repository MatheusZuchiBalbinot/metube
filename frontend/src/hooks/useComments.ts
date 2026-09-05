import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@store';
import { commentActions } from '@store/commentSlice';
import { toastActions } from '@store/toastSlice';
import {
    selectCommentById,
    selectCommentRepliesById,
    selectCommentLoadingReplies,
} from '@store/commentSelectors';
import { comments as commentsApi } from '@api';
import { ToastType } from '@enums/toastType';
import type { Comment } from '@models';
import type { Cuid, Vuid } from '@api';

const EMPTY_IDS: Cuid[] = [];

export function useComments(vuid: Vuid) {
    const dispatch = useAppDispatch();
    const commentIds = useAppSelector(s => s.comment.byVideo[vuid] ?? EMPTY_IDS);
    const byId = useAppSelector(selectCommentById);
    const pagination = useAppSelector(s => s.comment.pagination[vuid]);
    const isLoading = useAppSelector(s => s.comment.loadingVideos[vuid] ?? false);

    const commentList = commentIds
        .map(id => byId[id])
        .filter((c): c is Comment => c !== undefined);

    const showError = useCallback((message: string) => {
        dispatch(toastActions.addToast({ message, type: ToastType.ERROR }));
    }, [dispatch]);

    const load = useCallback(async (page = 1) => {
        dispatch(commentActions.setLoading({ vuid, loading: true }));

        const result = await commentsApi.list(vuid, { page });

        dispatch(commentActions.setLoading({ vuid, loading: false }));

        if (!result.ok) {
            showError(result.error);
            return;
        }

        if (page === 1) {
            dispatch(commentActions.setComments({
                vuid,
                comments: result.data.data,
                pagination: {
                    currentPage: result.data.meta.page,
                    lastPage: result.data.meta.lastPage,
                    total: result.data.meta.total,
                },
            }));
        } else {
            dispatch(commentActions.appendComments({
                vuid,
                comments: result.data.data,
                pagination: {
                    currentPage: result.data.meta.page,
                    lastPage: result.data.meta.lastPage,
                    total: result.data.meta.total,
                },
            }));
        }
    }, [dispatch, vuid, showError]);

    const loadMore = useCallback(async () => {
        const nextPage = (pagination?.currentPage ?? 0) + 1;
        await load(nextPage);
    }, [load, pagination]);

    const add = useCallback(async (content: string, parentCuid?: Cuid) => {
        const result = await commentsApi.create(vuid, { content, parentCuid });

        if (!result.ok) {
            showError(result.error);
            return;
        }

        const isReply = parentCuid !== undefined;

        if (isReply) {
            dispatch(commentActions.addReply({ parentCuid, comment: result.data }));
        } else {
            dispatch(commentActions.addComment({ vuid, comment: result.data }));
        }
    }, [dispatch, vuid, showError]);

    const edit = useCallback(async (cuid: Cuid, content: string) => {
        const result = await commentsApi.update(cuid, content);

        if (!result.ok) {
            showError(result.error);
            return;
        }

        dispatch(commentActions.updateComment(result.data));
    }, [dispatch, showError]);

    const remove = useCallback(async (cuid: Cuid, parentCuid?: Cuid) => {
        const result = await commentsApi.delete(cuid);

        if (!result.ok) {
            showError(result.error);
            return;
        }

        const isTopLevel = parentCuid === undefined;
        dispatch(commentActions.removeComment({ cuid, vuid: isTopLevel ? vuid : undefined, parentCuid }));
    }, [dispatch, vuid, showError]);

    const toggleLike = useCallback(async (cuid: Cuid) => {
        const before = byId[cuid];
        dispatch(commentActions.toggleLikeOptimistic(cuid));

        const result = await commentsApi.toggleLike(cuid);

        if (!result.ok) {
            if (before !== undefined) {
                dispatch(commentActions.updateComment(before));
            }
            showError(result.error);
        }
    }, [dispatch, byId, showError]);

    const loadReplies = useCallback(async (cuid: Cuid) => {
        dispatch(commentActions.setLoadingReplies({ cuid, loading: true }));

        const result = await commentsApi.replies(cuid);

        dispatch(commentActions.setLoadingReplies({ cuid, loading: false }));

        if (!result.ok) {
            showError(result.error);
            return;
        }

        dispatch(commentActions.setReplies({ parentCuid: cuid, comments: result.data }));
    }, [dispatch, showError]);

    const repliesById = useAppSelector(selectCommentRepliesById);

    const getReplies = useCallback((cuid: Cuid): Comment[] => {
        const replyIds = repliesById[cuid] ?? [];

        return replyIds
            .map(id => byId[id])
            .filter((c): c is Comment => c !== undefined);
    }, [byId, repliesById]);

    const loadingReplies = useAppSelector(selectCommentLoadingReplies);

    return {
        comments: commentList,
        isLoading,
        pagination,
        load,
        loadMore,
        add,
        edit,
        remove,
        toggleLike,
        loadReplies,
        loadingReplies,
        getReplies,
        byId,
    };
}

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@store';
import { commentActions } from '@store/commentSlice';
import { comments as commentsApi } from '@api';
import type { Comment } from '@models/comment';
import type { Cuid } from '@api/comments';
import type { Vuid } from '@api/videos';

const EMPTY_IDS: string[] = [];

export function useComments(vuid: Vuid) {
    const dispatch = useAppDispatch();
    const commentIds = useAppSelector(s => s.comment.byVideo[vuid as string] ?? EMPTY_IDS);
    const byId = useAppSelector(s => s.comment.byId);
    const pagination = useAppSelector(s => s.comment.pagination[vuid as string]);
    const isLoading = useAppSelector(s => s.comment.loadingVideos[vuid as string] ?? false);

    const commentList = commentIds
        .map(id => byId[id])
        .filter((c): c is Comment => c !== undefined);

    const load = useCallback(async (page = 1) => {
        dispatch(commentActions.setLoading({ vuid, loading: true }));

        const result = await commentsApi.list(vuid, { page });

        dispatch(commentActions.setLoading({ vuid, loading: false }));

        if (result === null) {
            return;
        }

        if (page === 1) {
            dispatch(commentActions.setComments({
                vuid,
                comments: result.data,
                pagination: {
                    currentPage: result.meta.page,
                    lastPage: result.meta.lastPage,
                    total: result.meta.total,
                },
            }));
        } else {
            dispatch(commentActions.appendComments({
                vuid,
                comments: result.data,
                pagination: {
                    currentPage: result.meta.page,
                    lastPage: result.meta.lastPage,
                    total: result.meta.total,
                },
            }));
        }
    }, [dispatch, vuid]);

    const loadMore = useCallback(async () => {
        const nextPage = (pagination?.currentPage ?? 0) + 1;
        await load(nextPage);
    }, [load, pagination]);

    const add = useCallback(async (content: string, parentCuid?: Cuid) => {
        const result = await commentsApi.create(vuid, { content, parentCuid });

        if (result === null) {
            return;
        }

        const isReply = parentCuid !== undefined;

        if (isReply) {
            dispatch(commentActions.addReply({ parentCuid, comment: result }));
        } else {
            dispatch(commentActions.addComment({ vuid, comment: result }));
        }
    }, [dispatch, vuid]);

    const edit = useCallback(async (cuid: Cuid, content: string) => {
        const result = await commentsApi.update(cuid as string, content);

        if (result === null) {
            return;
        }

        dispatch(commentActions.updateComment(result));
    }, [dispatch]);

    const remove = useCallback(async (cuid: Cuid, parentCuid?: Cuid) => {
        await commentsApi.delete(cuid as string);
        const isTopLevel = parentCuid === undefined;
        dispatch(commentActions.removeComment({ cuid, vuid: isTopLevel ? vuid : undefined, parentCuid }));
    }, [dispatch, vuid]);

    const toggleLike = useCallback(async (cuid: Cuid) => {
        const before = byId[cuid as string];
        dispatch(commentActions.toggleLikeOptimistic(cuid));

        const result = await commentsApi.toggleLike(cuid as string);

        const isFailure = result === null;

        if (isFailure && before !== undefined) {
            dispatch(commentActions.updateComment(before));
        }
    }, [dispatch, byId]);

    const loadReplies = useCallback(async (cuid: Cuid) => {
        dispatch(commentActions.setLoadingReplies({ cuid, loading: true }));

        const result = await commentsApi.replies(cuid as string);

        dispatch(commentActions.setLoadingReplies({ cuid, loading: false }));

        if (result === null) {
            return;
        }

        dispatch(commentActions.setReplies({ parentCuid: cuid, comments: result }));
    }, [dispatch]);

    const repliesById = useAppSelector(s => s.comment.repliesById);

    const getReplies = useCallback((cuid: Cuid): Comment[] => {
        const replyIds = repliesById[cuid as string] ?? [];

        return replyIds
            .map((id: string) => byId[id])
            .filter((c): c is Comment => c !== undefined);
    }, [byId, repliesById]);

    const loadingReplies = useAppSelector(s => s.comment.loadingReplies);

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

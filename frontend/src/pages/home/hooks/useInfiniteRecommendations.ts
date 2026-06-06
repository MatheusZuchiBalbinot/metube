import { useState, useEffect, useRef, useCallback } from 'react';
import { video as videoApi } from '@api';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';

/**
 * Loads page 1 of recommendations on mount and exposes `loadMore` for infinite
 * scroll. Stops once a page returns fewer than a full set of new items.
 */
export function useInfiniteRecommendations() {
    const dispatch = useAppDispatch();
    const pageRef = useRef(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        let isCancelled = false;

        async function loadFirst() {
            dispatch(videoActions.setRecommendationsLoading(true));
            const items = await videoApi.recommendations(1);
            if (isCancelled) {
                return;
            }
            dispatch(videoActions.setServerRecommendations(items));
            dispatch(videoActions.setRecommendationsLoading(false));
            pageRef.current = 1;
            setHasMore(items.length > 0);
        }

        void loadFirst();
        return () => {
            isCancelled = true;
        };
    }, [dispatch]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) {
            return;
        }

        setIsLoadingMore(true);
        const nextPage = pageRef.current + 1;
        const items = await videoApi.recommendations(nextPage);

        if (items.length === 0) {
            setHasMore(false);
        } else {
            pageRef.current = nextPage;
            dispatch(videoActions.appendServerRecommendations(items));
        }

        setIsLoadingMore(false);
    }, [dispatch, isLoadingMore, hasMore]);

    return { loadMore, isLoadingMore, hasMore };
}

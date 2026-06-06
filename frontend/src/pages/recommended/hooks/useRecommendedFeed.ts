import { useEffect } from 'react';
import { video as videoApi } from '@api';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';

/**
 * Loads the server-scored recommendations into the store for the Recommended
 * page, the same way the home feed loads its recommendations.
 */
export function useRecommendedFeed(): void {
    const dispatch = useAppDispatch();

    useEffect(() => {
        async function fetch() {
            dispatch(videoActions.setRecommendationsLoading(true));
            const items = await videoApi.recommendations(1);
            dispatch(videoActions.setServerRecommendations(items));
            dispatch(videoActions.setRecommendationsLoading(false));
        }

        void fetch();
    }, [dispatch]);
}

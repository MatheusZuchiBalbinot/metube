import { useEffect } from 'react';
import { video as videoApi } from '@api';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';

export function useHomeFeed(): void {
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

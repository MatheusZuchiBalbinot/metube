import { useEffect } from 'react';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { video as videoApi, toVuid } from '@api';
import { hasViewed, markViewed } from '@utils';
import type { VideoId } from '@models';

export function useViewTracking(
    id: string | undefined,
    hasVideo: boolean,
    watchVideo: (id: VideoId) => void,
): void {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const shouldRegister = hasVideo && id !== undefined && !hasViewed(id);

        if (!shouldRegister) {
            return;
        }

        const videoId = id as VideoId;
        markViewed(id);
        watchVideo(videoId);
        videoApi.recordView(toVuid(videoId));
        dispatch(videoActions.incrementViews(videoId));
    }, [id, hasVideo, watchVideo, dispatch]);
}

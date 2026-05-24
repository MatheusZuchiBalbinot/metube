import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions } from '@store/videoSlice';
import { video as videoApi, type Vuid } from '@api';
import type { Video } from '@models/video';
import { domain } from '@domain';

export function useVideoFetch(id: string | undefined, storeVideo: Video | undefined): { video: Video | undefined; fetchFailed: boolean } {
    const dispatch = useAppDispatch();
    const lastVideoStatusUpdate = useAppSelector(state => state.video.lastVideoStatusUpdate);

    const [fetchedVideo, setFetchedVideo] = useState<Video | null>(null);
    const [fetchFailed, setFetchFailed] = useState(false);

    useEffect(() => {
        if (id === undefined || storeVideo !== undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFetchedVideo(null);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFetchFailed(false);
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFetchFailed(false);

        videoApi.get(id as unknown as Vuid).then(result => {
            if (result !== null) {
                setFetchedVideo(result);
            } else {
                setFetchFailed(true);
            }
        }).catch(() => setFetchFailed(true));
    }, [id, storeVideo]);

    // When a VideoStatusUpdated WS event arrives for the current video and the video
    // is only in local state (not in the Redux store), re-fetch to pick up the new status.
    useEffect(() => {
        const isCurrentVideo = lastVideoStatusUpdate !== null && lastVideoStatusUpdate.vuid === id;
        const isOnlyInLocalState = storeVideo === undefined && fetchedVideo !== null;

        if (!isCurrentVideo || !isOnlyInLocalState) {
            return;
        }

        videoApi.get(id as unknown as Vuid).then(result => {
            if (result !== null) {
                setFetchedVideo(result);
            }
        });
    }, [lastVideoStatusUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

    const video = storeVideo ?? fetchedVideo ?? undefined;

    // Fallback poll: if the video is stuck in PROCESSING and neither the WS event
    // nor the upload-modal poll resolves it (e.g. user closed modal early, Reverb down),
    // check every 5 s until the status transitions.
    useEffect(() => {
        const isVideoProcessing = video !== undefined && domain.video.isProcessing(video);

        if (!isVideoProcessing || id === undefined) {
            return;
        }

        const vuid = id as unknown as Vuid;
        const timer = setInterval(() => {
            videoApi.get(vuid).then(result => {
                const hasTransitioned = result !== null && !domain.video.isProcessing(result);

                if (!hasTransitioned) {
                    return;
                }

                dispatch(videoActions.updateVideo(result));
            });
        }, 5000);

        return () => clearInterval(timer);
    }, [video?.status, id, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

    return { video, fetchFailed };
}

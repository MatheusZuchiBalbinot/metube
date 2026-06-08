import { useState, useEffect } from 'react';
import { video as videoApi, toVuid } from '@api';
import type { Video, VideoId } from '@models';

export function useRelatedVideos(videoId: VideoId | undefined): { relatedVideos: Video[]; loadingRelated: boolean } {
    const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);

    useEffect(() => {
        const isVideoReady = videoId !== undefined;

        if (!isVideoReady) {
            return;
        }

        let isCancelled = false;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoadingRelated(true);

        videoApi.related(toVuid(videoId)).then(result => {
            if (!isCancelled) {
                setRelatedVideos(result);
            }
        }).finally(() => {
            if (!isCancelled) {
                setLoadingRelated(false);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [videoId]);

    return { relatedVideos, loadingRelated };
}

import { useState, useEffect } from 'react';
import { video as videoApi } from '@api';
import type { Video, VideoId, Tag } from '@models';

export function useRelatedVideos(videoId: VideoId | undefined, tags: Tag[]): { relatedVideos: Video[]; loadingRelated: boolean } {
    const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);

    useEffect(() => {
        const isVideoReady = videoId !== undefined;

        if (!isVideoReady) {
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoadingRelated(true);

        videoApi.list({ tags, page: 1 }).then(result => {
            if (!result.ok) {
                return;
            }

            const filtered = result.data.data
                .filter(v => v.id !== videoId)
                .slice(0, 10);

            setRelatedVideos(filtered);
        }).finally(() => {
            setLoadingRelated(false);
        });
    }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

    return { relatedVideos, loadingRelated };
}

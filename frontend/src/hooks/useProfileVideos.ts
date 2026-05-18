import { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@store';
import { channel as channelApi } from '@api';
import type { Uuid } from '@api';
import type { Video, VideoStatus } from '@models/video';

interface UseProfileVideosResult {
    ownVideos: Video[]
    setOwnVideos: React.Dispatch<React.SetStateAction<Video[]>>
    loadingOwnVideos: boolean
}

export function useProfileVideos(channelId: string, isOwnProfile: boolean): UseProfileVideosResult {
    const lastVideoStatusUpdate = useAppSelector(state => state.video.lastVideoStatusUpdate);
    const reduxVideosCount = useAppSelector(state => state.video.videos.length);
    const hasFetchedRef = useRef(false);

    const [ownVideos, setOwnVideos] = useState<Video[]>([]);
    const [loadingOwnVideos, setLoadingOwnVideos] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const isInitial = !hasFetchedRef.current;

        if (isInitial) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoadingOwnVideos(true);
        }

        channelApi.videos(channelId as unknown as Uuid).then(result => {
            if (cancelled || !result) {
                return;
            }

            setOwnVideos(result.data);
        }).finally(() => {
            if (cancelled) {
                return;
            }

            hasFetchedRef.current = true;
            setLoadingOwnVideos(false);
        });

        return () => {
            cancelled = true;
        };
    }, [channelId, lastVideoStatusUpdate, reduxVideosCount]);

    // Optimistic local patch — applies WS status update instantly so the
    // user sees the badge change before the refetch lands.
    useEffect(() => {
        const hasUpdate = lastVideoStatusUpdate !== null && isOwnProfile;

        if (!hasUpdate) {
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOwnVideos(prev => prev.map(v =>
            v.id === (lastVideoStatusUpdate.vuid as unknown as typeof v.id)
                ? { ...v, status: lastVideoStatusUpdate.status as VideoStatus }
                : v,
        ));
    }, [lastVideoStatusUpdate, isOwnProfile]);

    return { ownVideos, setOwnVideos, loadingOwnVideos };
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '@store';
import { channel as channelApi, toUuid } from '@api';
import { RemoteData, type Video, type VideoStatus } from '@models';

interface UseProfileVideosResult {
    videosState: RemoteData<Video[]>
    setVideos: (updater: (prev: Video[]) => Video[]) => void
}

export function useProfileVideos(channelId: string, isOwnProfile: boolean): UseProfileVideosResult {
    const lastVideoStatusUpdate = useAppSelector(state => state.video.lastVideoStatusUpdate);
    const reduxVideosCount = useAppSelector(state => state.video.videos.length);
    const hasFetchedRef = useRef(false);

    const [videosState, setVideosState] = useState<RemoteData<Video[]>>(RemoteData.loading());

    const setVideos = useCallback((updater: (prev: Video[]) => Video[]) => {
        setVideosState(prev => {
            const isLoaded = prev.kind === 'ok';

            if (!isLoaded) {
                return prev;
            }

            return RemoteData.ok(updater(prev.data));
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        const isInitial = !hasFetchedRef.current;

        if (isInitial) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVideosState(RemoteData.loading());
        }

        channelApi.videos(toUuid(channelId)).then(result => {
            if (cancelled || !result.ok) {
                return;
            }

            setVideosState(RemoteData.ok(result.data.data));
        }).finally(() => {
            if (cancelled) {
                return;
            }

            hasFetchedRef.current = true;
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
        setVideos(prev => prev.map(v =>
            (v.id as string) === (lastVideoStatusUpdate.vuid as string)
                ? { ...v, status: lastVideoStatusUpdate.status as VideoStatus }
                : v,
        ));
    }, [lastVideoStatusUpdate, isOwnProfile, setVideos]);

    return { videosState, setVideos };
}

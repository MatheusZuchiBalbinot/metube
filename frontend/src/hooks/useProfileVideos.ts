import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '@store';
import { channel as channelApi } from '@api';
import type { Uuid } from '@api';
import type { Video, VideoStatus } from '@models/video';
import { RemoteData } from '@models/remoteData';

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

        channelApi.videos(channelId as unknown as Uuid).then(result => {
            if (cancelled || !result) {
                return;
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVideosState(RemoteData.ok(result.data));
        }).catch((err: unknown) => {
            if (cancelled) {
                return;
            }
            const message = err instanceof Error ? err.message : 'Unknown error';
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVideosState(RemoteData.error(message));
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

        setVideos(prev => prev.map(v =>
            (v.id as string) === (lastVideoStatusUpdate.vuid as string)
                ? { ...v, status: lastVideoStatusUpdate.status as VideoStatus }
                : v,
        ));
    }, [lastVideoStatusUpdate, isOwnProfile, setVideos]);

    return { videosState, setVideos };
}

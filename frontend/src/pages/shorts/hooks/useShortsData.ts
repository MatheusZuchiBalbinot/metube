import { useEffect, useMemo } from 'react';
import { useVideo } from '@hooks';
import type { Tag } from '@models';
import type { Video } from '@models';

export interface ShortsData {
    shorts: Video[]
    muted: boolean
    volume: number
    setMuted: (muted: boolean) => void
    setVolume: (volume: number) => void
}

export function useShortsData(): ShortsData {
    const {
        publishedVideos, closeMiniPlayer,
        shortsMuted: muted, shortsVolume: volume,
        setShortsMuted: setMuted, setShortsVolume: setVolume,
    } = useVideo();

    useEffect(() => {
        closeMiniPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const shorts = useMemo(
        () => publishedVideos.filter(v => v.tags.includes('shorts' as Tag)),
        [publishedVideos],
    );

    return { shorts, muted, volume, setMuted, setVolume };
}

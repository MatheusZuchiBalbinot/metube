import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { video as videoApi, toVuid } from '@api';
import { useVideoActions } from '@hooks';
import { hasViewed, markViewed } from '@utils';
import type { Video } from '@models';

export interface ShortsNavigation {
    renderedIndex: number
    activateIndex: (index: number) => void
    scrollToIndex: (index: number) => void
}

export function useShortsNavigation(
    shorts: Video[],
    videoMap: React.MutableRefObject<Map<number, HTMLVideoElement>>,
    itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
): ShortsNavigation {
    const dispatch = useAppDispatch();
    const { watchVideo } = useVideoActions();
    const [renderedIndex, setRenderedIndex] = useState(0);
    const activeIndexRef = useRef(0);

    // Stable refs so activateIndex callback never goes stale
    const shortsRef = useRef(shorts);
    const watchVideoRef = useRef(watchVideo);

    useLayoutEffect(() => {
        shortsRef.current = shorts;
        watchVideoRef.current = watchVideo;
    });

    const activateIndex = useCallback((newIndex: number) => {
        const isAlreadyActive = newIndex === activeIndexRef.current;
        const isPlaying = !(videoMap.current.get(newIndex)?.paused ?? true);

        if (isAlreadyActive && isPlaying) {
            return;
        }

        videoMap.current.forEach((el, i) => {
            const isCurrent = i === newIndex;

            if (isCurrent) {
                el.currentTime = 0;
                el.play().catch(() => undefined);
            } else {
                el.pause();
            }
        });

        const shortId = shortsRef.current[newIndex]?.id;
        const hasId = shortId !== undefined;

        if (hasId) {
            watchVideoRef.current(shortId);

            if (!hasViewed(shortId)) {
                markViewed(shortId);
                videoApi.recordView(toVuid(shortId));
                dispatch(videoActions.incrementViews(shortId));
            }
        }

        setRenderedIndex(newIndex);
        activeIndexRef.current = newIndex;
    }, [videoMap, dispatch]);

    const scrollToIndex = useCallback((index: number) => {
        const isOutOfBounds = index < 0 || index >= shortsRef.current.length;

        if (isOutOfBounds) {
            return;
        }

        itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
    }, [itemRefs]);

    return { renderedIndex, activateIndex, scrollToIndex };
}

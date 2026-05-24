import { useLayoutEffect, useRef } from 'react';

export interface ShortsRefs {
    itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
    videoMap: React.MutableRefObject<Map<number, HTMLVideoElement>>
    videoRefs: React.MutableRefObject<React.RefObject<HTMLVideoElement | null>[]>
    mountVideo: (index: number, el: HTMLVideoElement | null) => void
}

export function useShortsRefs(count: number): ShortsRefs {
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const videoMap = useRef<Map<number, HTMLVideoElement>>(new Map());
    const videoRefs = useRef<React.RefObject<HTMLVideoElement | null>[]>([]);

    useLayoutEffect(() => {
        while (videoRefs.current.length < count) {
            videoRefs.current.push({ current: null });
        }
    }, [count]);

    function mountVideo(index: number, el: HTMLVideoElement | null) {
        const isRemoving = el === null;

        if (isRemoving) {
            videoMap.current.delete(index);
            return;
        }

        videoMap.current.set(index, el);
    }

    return { itemRefs, videoMap, videoRefs, mountVideo };
}

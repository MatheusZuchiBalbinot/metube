import { useRef } from 'react';

export interface ShortsRefs {
    itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
    videoMap: React.MutableRefObject<Map<number, HTMLVideoElement>>
    getVideoRef: (index: number) => React.RefObject<HTMLVideoElement | null>
    mountVideo: (index: number, el: HTMLVideoElement | null) => void
}

export function useShortsRefs(): ShortsRefs {
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const videoMap = useRef<Map<number, HTMLVideoElement>>(new Map());
    const videoRefsMap = useRef<Map<number, React.RefObject<HTMLVideoElement | null>>>(new Map());

    // ShortsPage needs a ref for `index` synchronously while rendering each
    // ShortsItem — growing a shared array to `count` inside an effect left new
    // indices without a ref for the render that introduced them (including
    // whenever a hidden short "reappears" and its effects reconnect), which
    // crashed usePlayerPlayback/ShortPlayer with "Cannot read properties of
    // undefined (reading 'current')". Creating each entry lazily — only the
    // first time its index is requested — is the React-sanctioned exception to
    // "don't touch ref.current during render" (`react-hooks/refs`), unlike
    // eagerly mutating a shared array on every render.
    function getVideoRef(index: number): React.RefObject<HTMLVideoElement | null> {
        let ref = videoRefsMap.current.get(index);

        if (!ref) {
            ref = { current: null };
            videoRefsMap.current.set(index, ref);
        }

        return ref;
    }

    function mountVideo(index: number, el: HTMLVideoElement | null) {
        const isRemoving = el === null;

        if (isRemoving) {
            videoMap.current.delete(index);
            return;
        }

        videoMap.current.set(index, el);
    }

    return { itemRefs, videoMap, getVideoRef, mountVideo };
}

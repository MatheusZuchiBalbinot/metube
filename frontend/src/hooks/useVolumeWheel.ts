import { useEffect, useLayoutEffect, useRef } from 'react';

export function useVolumeWheel(
    containerRef: React.RefObject<HTMLElement | null>,
    videoRef: React.RefObject<HTMLVideoElement | null>,
    applyVolume: (v: number) => void,
    revealControls: () => void,
) {
    const cbRef = useRef({ applyVolume, revealControls });
    useLayoutEffect(() => {
        cbRef.current = { applyVolume, revealControls };
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        function onWheel(e: WheelEvent) {
            const el = videoRef.current;
            if (!el) {
                return;
            }
            const delta = e.deltaY < 0 ? 0.05 : -0.05;
            const newVol = Math.min(1, Math.max(0, el.volume + delta));
            cbRef.current.applyVolume(newVol);
            cbRef.current.revealControls();
        }

        container.addEventListener('wheel', onWheel, { passive: true });
        return () => container.removeEventListener('wheel', onWheel);
    }, [containerRef, videoRef]);
}

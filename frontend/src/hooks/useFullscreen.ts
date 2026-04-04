import { useState, useEffect, useCallback } from 'react';

export function useFullscreen(containerRef: React.RefObject<HTMLElement | null>) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        function onFsChange() {
            setIsFullscreen(document.fullscreenElement !== null);
        }
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        } else {
            container.requestFullscreen().catch(() => { });
        }
    }, [containerRef]);

    return { isFullscreen, toggleFullscreen };
}

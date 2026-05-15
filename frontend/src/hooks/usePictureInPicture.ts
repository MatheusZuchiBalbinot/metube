import { useState, useEffect, useCallback } from 'react';

export function usePictureInPicture(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [isActive, setIsActive] = useState(false);
    const isSupported = typeof document !== 'undefined' && document.pictureInPictureEnabled;

    useEffect(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }

        function onEnter() {
            setIsActive(true);
        }

        function onLeave() {
            setIsActive(false);
        }

        el.addEventListener('enterpictureinpicture', onEnter);
        el.addEventListener('leavepictureinpicture', onLeave);

        return () => {
            el.removeEventListener('enterpictureinpicture', onEnter);
            el.removeEventListener('leavepictureinpicture', onLeave);
        };
    }, [videoRef]);

    const togglePiP = useCallback(async () => {
        const el = videoRef.current;
        const isNotAvailable = !el || !isSupported;
        if (isNotAvailable) {
            return;
        }

        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture().catch(() => { });
        } else {
            await el.requestPictureInPicture().catch(() => { });
        }
    }, [videoRef, isSupported]);

    return { isActive, isSupported, togglePiP };
}

import { useEffect, useRef, useState } from 'react';

export interface AbRepeat {
    a: number | null
    b: number | null
}

/** 0 = inactive, 1 = point A set, 2 = full A–B loop armed. */
export type AbStatus = 0 | 1 | 2;

interface UsePlayerAbRepeatResult {
    abRepeat: AbRepeat
    abStatus: AbStatus
    handleAbRepeat: () => void
}

/**
 * A–B repeat: first press marks point A, second marks B, third clears. While a
 * full A–B range is armed, playback jumps back to A whenever it passes B. The
 * range resets whenever the source changes.
 */
export function usePlayerAbRepeat(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    src: string,
): UsePlayerAbRepeatResult {
    const [abRepeat, setAbRepeat] = useState<AbRepeat>({ a: null, b: null });

    // Mirror the bounds into a ref so the timeupdate listener stays stable.
    const abRepeatRef = useRef(abRepeat);
    useEffect(() => {
        abRepeatRef.current = abRepeat;
    }, [abRepeat]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset of A–B bounds when the source changes
        setAbRepeat({ a: null, b: null });
    }, [src]);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }

        function onTimeUpdate() {
            const video = videoRef.current;
            const { a, b } = abRepeatRef.current;

            if (video !== null && a !== null && b !== null && video.currentTime >= b) {
                video.currentTime = a;
            }
        }

        el.addEventListener('timeupdate', onTimeUpdate);
        return () => el.removeEventListener('timeupdate', onTimeUpdate);
    }, [videoRef]);

    function handleAbRepeat() {
        const el = videoRef.current;
        if (!el) {
            return;
        }

        setAbRepeat(prev => {
            if (prev.a === null) {
                return { a: el.currentTime, b: null };
            }

            if (prev.b === null) {
                const now = el.currentTime;
                return now > prev.a ? { a: prev.a, b: now } : { a: now, b: prev.a };
            }

            return { a: null, b: null };
        });
    }

    function getAbStatus(): AbStatus {
        if (abRepeat.a === null) {
            return 0;
        }

        if (abRepeat.b === null) {
            return 1;
        }

        return 2;
    }

    return { abRepeat, abStatus: getAbStatus(), handleAbRepeat };
}

import { useState, useEffect, useCallback } from 'react';
import type { VideoCaption } from '@models';

const STORAGE_KEY = 'captions.preferredLang';

function getSavedLang(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

function saveLang(lang: string | null): void {
    try {
        if (lang === null) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, lang);
        }
    } catch {
        // ignore
    }
}

export function usePlayerCaptions(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    captions: VideoCaption[],
) {
    const [activeTrack, setActiveTrackState] = useState<string | null>(() => {
        const savedLang = getSavedLang();
        const hasSavedTrack = savedLang !== null && captions.some(c => c.lang === savedLang);
        return hasSavedTrack ? savedLang : null;
    });

    const hasCaptions = captions.length > 0;

    useEffect(() => {
        const el = videoRef.current;
        const isNotReady = !el || !hasCaptions;
        if (isNotReady) {
            return;
        }

        // Sync native text tracks with activeTrack state
        for (let i = 0; i < el.textTracks.length; i++) {
            const track = el.textTracks[i];
            const isActive = track.language === activeTrack;
            track.mode = isActive ? 'showing' : 'disabled';
        }
    }, [activeTrack, videoRef, hasCaptions]);

    const setActiveTrack = useCallback((lang: string | null) => {
        setActiveTrackState(lang);
        saveLang(lang);
    }, []);

    const toggleCaptions = useCallback(() => {
        const isOff = activeTrack === null;

        if (isOff) {
            const savedLang = getSavedLang();
            const preferred = captions.find(c => c.lang === savedLang) ?? captions[0];
            const nextLang = preferred?.lang ?? null;
            setActiveTrack(nextLang);
        } else {
            setActiveTrack(null);
        }
    }, [activeTrack, captions, setActiveTrack]);

    return { activeTrack, setActiveTrack, toggleCaptions, hasCaptions };
}

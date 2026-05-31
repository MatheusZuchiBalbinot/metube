import { useState, useCallback } from 'react';
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

export function usePlayerCaptions(captions: VideoCaption[]) {
    const [activeTrack, setActiveTrackState] = useState<string | null>(() => {
        const savedLang = getSavedLang();
        const hasSavedTrack = savedLang !== null && captions.some(c => c.lang === savedLang);
        return hasSavedTrack ? savedLang : null;
    });

    const hasCaptions = captions.length > 0;

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

import { useState } from 'react';
import { STORAGE_KEYS } from '@utils';
import type { CaptionSize } from '@components/player/playerTypes';

function loadCaptionSize(): CaptionSize {
    const raw = localStorage.getItem(STORAGE_KEYS.CAPTION_SIZE);
    return raw === 'sm' || raw === 'lg' ? raw : 'md';
}

interface UsePlayerLocalPrefsResult {
    ambientEnabled: boolean
    toggleAmbient: () => void
    captionSize: CaptionSize
    setCaptionSize: (size: CaptionSize) => void
}

/**
 * Player preferences persisted in localStorage: ambient glow on/off and caption
 * size. Each setter writes through to storage so the choice survives reloads.
 */
export function usePlayerLocalPrefs(): UsePlayerLocalPrefsResult {
    const [ambientEnabled, setAmbientEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.PLAYER_AMBIENT) !== 'false');
    const [captionSize, setCaptionSizeState] = useState<CaptionSize>(loadCaptionSize);

    function toggleAmbient() {
        setAmbientEnabled(prev => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEYS.PLAYER_AMBIENT, String(next));
            return next;
        });
    }

    function setCaptionSize(size: CaptionSize) {
        setCaptionSizeState(size);
        localStorage.setItem(STORAGE_KEYS.CAPTION_SIZE, size);
    }

    return { ambientEnabled, toggleAmbient, captionSize, setCaptionSize };
}

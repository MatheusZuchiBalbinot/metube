import { useEffect, useState } from 'react';

export interface ShortPanels {
    showVolumeSlider: boolean
    showDescription: boolean
    handlePanelToggle: (e: React.MouseEvent | React.KeyboardEvent, panel: 'volume' | 'description') => void
    closeAll: () => void
}

export function useShortPanels(): ShortPanels {
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showDescription, setShowDescription] = useState(false);

    function handlePanelToggle(e: React.MouseEvent | React.KeyboardEvent, panel: 'volume' | 'description') {
        e.stopPropagation();

        if (panel === 'volume') {
            setShowVolumeSlider(v => !v);
        } else {
            setShowDescription(v => !v);
        }
    }

    function closeAll() {
        setShowVolumeSlider(false);
        setShowDescription(false);
    }

    useEffect(() => {
        if (!showDescription) {
            return;
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setShowDescription(false);
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showDescription]);

    return { showVolumeSlider, showDescription, handlePanelToggle, closeAll };
}

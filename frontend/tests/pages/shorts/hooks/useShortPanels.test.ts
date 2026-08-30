// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShortPanels } from '@pages/shorts/hooks/useShortPanels';

function makeEvent() {
    return { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
}

describe('useShortPanels', () => {
    it('starts with both panels closed', () => {
        const { result } = renderHook(() => useShortPanels());

        expect(result.current.showVolumeSlider).toBe(false);
        expect(result.current.showDescription).toBe(false);
    });

    it('handlePanelToggle toggles the volume panel', () => {
        const { result } = renderHook(() => useShortPanels());

        act(() => {
            result.current.handlePanelToggle(makeEvent(), 'volume');
        });
        expect(result.current.showVolumeSlider).toBe(true);

        act(() => {
            result.current.handlePanelToggle(makeEvent(), 'volume');
        });
        expect(result.current.showVolumeSlider).toBe(false);
    });

    it('handlePanelToggle toggles the description panel independently', () => {
        const { result } = renderHook(() => useShortPanels());

        act(() => {
            result.current.handlePanelToggle(makeEvent(), 'description');
        });

        expect(result.current.showDescription).toBe(true);
        expect(result.current.showVolumeSlider).toBe(false);
    });

    it('closeAll closes both panels', () => {
        const { result } = renderHook(() => useShortPanels());

        act(() => {
            result.current.handlePanelToggle(makeEvent(), 'volume');
            result.current.handlePanelToggle(makeEvent(), 'description');
        });
        act(() => {
            result.current.closeAll();
        });

        expect(result.current.showVolumeSlider).toBe(false);
        expect(result.current.showDescription).toBe(false);
    });

    it('closes the description panel on Escape while it is open', () => {
        const { result } = renderHook(() => useShortPanels());

        act(() => {
            result.current.handlePanelToggle(makeEvent(), 'description');
        });
        expect(result.current.showDescription).toBe(true);

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });

        expect(result.current.showDescription).toBe(false);
    });
});

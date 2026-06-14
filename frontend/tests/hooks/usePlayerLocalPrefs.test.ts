// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerLocalPrefs } from '@hooks/usePlayerLocalPrefs';
import { STORAGE_KEYS } from '@utils';

describe('usePlayerLocalPrefs', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('defaults ambient on and caption size to md', () => {
        const { result } = renderHook(() => usePlayerLocalPrefs());

        expect(result.current.ambientEnabled).toBe(true);
        expect(result.current.captionSize).toBe('md');
    });

    it('reads ambient off from storage', () => {
        localStorage.setItem(STORAGE_KEYS.PLAYER_AMBIENT, 'false');
        const { result } = renderHook(() => usePlayerLocalPrefs());

        expect(result.current.ambientEnabled).toBe(false);
    });

    it('reads a stored caption size', () => {
        localStorage.setItem(STORAGE_KEYS.CAPTION_SIZE, 'lg');
        const { result } = renderHook(() => usePlayerLocalPrefs());

        expect(result.current.captionSize).toBe('lg');
    });

    it('falls back to md for an invalid stored caption size', () => {
        localStorage.setItem(STORAGE_KEYS.CAPTION_SIZE, 'huge');
        const { result } = renderHook(() => usePlayerLocalPrefs());

        expect(result.current.captionSize).toBe('md');
    });

    it('toggles ambient and persists it', () => {
        const { result } = renderHook(() => usePlayerLocalPrefs());

        act(() => {
            result.current.toggleAmbient();
        });

        expect(result.current.ambientEnabled).toBe(false);
        expect(localStorage.getItem(STORAGE_KEYS.PLAYER_AMBIENT)).toBe('false');
    });

    it('sets caption size and persists it', () => {
        const { result } = renderHook(() => usePlayerLocalPrefs());

        act(() => {
            result.current.setCaptionSize('sm');
        });

        expect(result.current.captionSize).toBe('sm');
        expect(localStorage.getItem(STORAGE_KEYS.CAPTION_SIZE)).toBe('sm');
    });
});

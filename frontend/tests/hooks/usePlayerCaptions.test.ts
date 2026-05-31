// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerCaptions } from '@hooks/usePlayerCaptions';
import type { VideoCaption } from '@models';

function makeCaption(lang: string): VideoCaption {
    return { lang, label: lang.toUpperCase(), src: `/cc/${lang}.vtt` } as VideoCaption;
}

describe('usePlayerCaptions', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('starts with activeTrack=null when no saved language', () => {
        const { result } = renderHook(() => usePlayerCaptions([]));

        expect(result.current.activeTrack).toBeNull();
        expect(result.current.hasCaptions).toBe(false);
    });

    it('hasCaptions=true when captions array is non-empty', () => {
        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en')]));

        expect(result.current.hasCaptions).toBe(true);
    });

    it('restores saved language from localStorage if present in captions list', () => {
        localStorage.setItem('captions.preferredLang', 'pt');
        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en'), makeCaption('pt')]));

        expect(result.current.activeTrack).toBe('pt');
    });

    it('ignores saved language if not present in captions list', () => {
        localStorage.setItem('captions.preferredLang', 'zz');
        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en')]));

        expect(result.current.activeTrack).toBeNull();
    });

    it('setActiveTrack updates state and persists to localStorage', () => {
        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en')]));

        act(() => {
            result.current.setActiveTrack('en');
        });

        expect(result.current.activeTrack).toBe('en');
        expect(localStorage.getItem('captions.preferredLang')).toBe('en');
    });

    it('setActiveTrack(null) removes the saved language', () => {
        localStorage.setItem('captions.preferredLang', 'en');
        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en')]));

        act(() => {
            result.current.setActiveTrack(null);
        });

        expect(localStorage.getItem('captions.preferredLang')).toBeNull();
    });

    it('toggleCaptions enables a track when previously off (prefers saved lang)', () => {
        localStorage.setItem('captions.preferredLang', 'pt');
        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en'), makeCaption('pt')]));

        act(() => {
            result.current.setActiveTrack(null);
            localStorage.setItem('captions.preferredLang', 'pt');
        });

        act(() => {
            result.current.toggleCaptions();
        });

        expect(result.current.activeTrack).toBe('pt');
    });

    it('toggleCaptions falls back to the first caption when no saved lang', () => {
        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en')]));

        act(() => {
            result.current.toggleCaptions();
        });

        expect(result.current.activeTrack).toBe('en');
    });

    it('toggleCaptions turns off when a track is active', () => {
        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en')]));

        act(() => {
            result.current.setActiveTrack('en');
        });

        act(() => {
            result.current.toggleCaptions();
        });

        expect(result.current.activeTrack).toBeNull();
    });

    it('handles localStorage throwing on read', () => {
        const original = Storage.prototype.getItem;
        Storage.prototype.getItem = vi.fn(() => {
            throw new Error('blocked');
        });

        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en')]));

        expect(result.current.activeTrack).toBeNull();
        Storage.prototype.getItem = original;
    });

    it('handles localStorage throwing on write', () => {
        const { result } = renderHook(() => usePlayerCaptions([makeCaption('en')]));

        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = vi.fn(() => {
            throw new Error('blocked');
        });

        expect(() => {
            act(() => {
                result.current.setActiveTrack('en');
            });
        }).not.toThrow();

        Storage.prototype.setItem = original;
    });
});

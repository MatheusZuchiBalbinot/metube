// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerCaptions } from '@hooks/usePlayerCaptions';
import type { VideoCaption } from '@models';

interface MockTextTrack {
    language: string;
    mode: TextTrackMode;
}

function makeVideoRefWithTracks(tracks: MockTextTrack[]) {
    const el = document.createElement('video');
    Object.defineProperty(el, 'textTracks', {
        configurable: true,
        get: () => tracks as unknown as TextTrackList,
    });
    return { current: el };
}

function makeCaption(lang: string): VideoCaption {
    return { lang, label: lang.toUpperCase(), src: `/cc/${lang}.vtt` } as VideoCaption;
}

describe('usePlayerCaptions', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('starts with activeTrack=null when no saved language', () => {
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, []));

        expect(result.current.activeTrack).toBeNull();
        expect(result.current.hasCaptions).toBe(false);
    });

    it('hasCaptions=true when captions array is non-empty', () => {
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en')]));

        expect(result.current.hasCaptions).toBe(true);
    });

    it('restores saved language from localStorage if present in captions list', () => {
        localStorage.setItem('captions.preferredLang', 'pt');
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en'), makeCaption('pt')]));

        expect(result.current.activeTrack).toBe('pt');
    });

    it('ignores saved language if not present in captions list', () => {
        localStorage.setItem('captions.preferredLang', 'zz');
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en')]));

        expect(result.current.activeTrack).toBeNull();
    });

    it('setActiveTrack updates state and persists to localStorage', () => {
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en')]));

        act(() => {
            result.current.setActiveTrack('en');
        });

        expect(result.current.activeTrack).toBe('en');
        expect(localStorage.getItem('captions.preferredLang')).toBe('en');
    });

    it('setActiveTrack(null) removes the saved language', () => {
        localStorage.setItem('captions.preferredLang', 'en');
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en')]));

        act(() => {
            result.current.setActiveTrack(null);
        });

        expect(localStorage.getItem('captions.preferredLang')).toBeNull();
    });

    it('toggleCaptions enables a track when previously off (prefers saved lang)', () => {
        // Saved lang is 'pt' but initial captions only have 'en', so activeTrack starts null.
        localStorage.setItem('captions.preferredLang', 'pt');
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en'), makeCaption('pt')]));

        // activeTrack should be 'pt' since the saved lang IS in captions list.
        // Force it back to null without touching localStorage by re-rendering with empty.
        act(() => {
            // Wipe the React state, but DO NOT clear localStorage
            result.current.setActiveTrack(null);
            localStorage.setItem('captions.preferredLang', 'pt');
        });

        act(() => {
            result.current.toggleCaptions();
        });

        expect(result.current.activeTrack).toBe('pt');
    });

    it('toggleCaptions falls back to the first caption when no saved lang', () => {
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en')]));

        act(() => {
            result.current.toggleCaptions();
        });

        expect(result.current.activeTrack).toBe('en');
    });

    it('toggleCaptions turns off when a track is active', () => {
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en')]));

        act(() => {
            result.current.setActiveTrack('en');
        });

        act(() => {
            result.current.toggleCaptions();
        });

        expect(result.current.activeTrack).toBeNull();
    });

    it('syncs native textTracks mode when activeTrack changes', () => {
        const tracks: MockTextTrack[] = [
            { language: 'en', mode: 'disabled' as TextTrackMode },
            { language: 'pt', mode: 'disabled' as TextTrackMode },
        ];
        const ref = makeVideoRefWithTracks(tracks);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en'), makeCaption('pt')]));

        act(() => {
            result.current.setActiveTrack('pt');
        });

        expect(tracks[0].mode).toBe('disabled');
        expect(tracks[1].mode).toBe('showing');
    });

    it('handles localStorage throwing on read', () => {
        const original = Storage.prototype.getItem;
        Storage.prototype.getItem = vi.fn(() => {
            throw new Error('blocked');
        });

        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en')]));

        expect(result.current.activeTrack).toBeNull();
        Storage.prototype.getItem = original;
    });

    it('handles localStorage throwing on write', () => {
        const ref = makeVideoRefWithTracks([]);
        const { result } = renderHook(() => usePlayerCaptions(ref, [makeCaption('en')]));

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

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const playerInstance = vi.hoisted(() => ({
    addEventListener: vi.fn(),
    attach: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    getVariantTracks: vi.fn(),
    configure: vi.fn(),
    selectVariantTrack: vi.fn(),
    destroy: vi.fn(),
}));

const shakaMock = vi.hoisted(() => ({
    polyfill: {
        installAll: vi.fn(),
    },
}));

vi.mock('shaka-player', () => ({
    default: {
        ...shakaMock,
        Player: function ShakaPlayerCtor() {
            return playerInstance;
        },
    },
}));

import { useShaka } from '@hooks/useShaka';

function makeVideoRef() {
    const el = document.createElement('video');
    return { ref: { current: el } };
}

describe('useShaka', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        playerInstance.getVariantTracks.mockReturnValue([]);
    });

    it('returns empty levels initially', () => {
        const { ref } = makeVideoRef();
        const { result } = renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        expect(result.current.levels).toEqual([]);
        expect(result.current.currentQuality).toBe(-1);
    });

    it('does nothing when src is empty', () => {
        const { ref } = makeVideoRef();
        renderHook(() => useShaka(ref, ''));

        expect(playerInstance.attach).not.toHaveBeenCalled();
    });

    it('does nothing when videoRef.current is null', () => {
        renderHook(() => useShaka({ current: null }, 'https://example.com/stream.mpd'));

        expect(playerInstance.attach).not.toHaveBeenCalled();
    });

    it('attaches and loads the player when src and ref are provided', async () => {
        const { ref } = makeVideoRef();
        renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        await waitFor(() => {
            expect(playerInstance.attach).toHaveBeenCalled();
            expect(playerInstance.load).toHaveBeenCalledWith('https://example.com/stream.mpd');
        });
    });

    it('builds unique levels sorted from highest to lowest', async () => {
        playerInstance.getVariantTracks.mockReturnValue([
            { height: 720, bandwidth: 2500000 },
            { height: 1080, bandwidth: 5000000 },
            { height: 720, bandwidth: 2400000 }, // duplicate height should be skipped
            { height: 360, bandwidth: 800000 },
        ]);

        const { ref } = makeVideoRef();
        const { result } = renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        await waitFor(() => {
            expect(result.current.levels).toHaveLength(3);
        });

        expect(result.current.levels[0].height).toBe(1080);
        expect(result.current.levels[2].height).toBe(360);
    });

    it('setQuality(-1) enables ABR and resets currentQuality', async () => {
        const { ref } = makeVideoRef();
        const { result } = renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        await waitFor(() => {
            expect(playerInstance.attach).toHaveBeenCalled();
        });

        act(() => {
            result.current.setQuality(-1);
        });

        expect(playerInstance.configure).toHaveBeenCalledWith({ abr: { enabled: true } });
        expect(result.current.currentQuality).toBe(-1);
    });

    it('setQuality with a valid index disables ABR and selects the track', async () => {
        playerInstance.getVariantTracks.mockReturnValue([
            { height: 720, bandwidth: 2500000 },
            { height: 1080, bandwidth: 5000000 },
        ]);

        const { ref } = makeVideoRef();
        const { result } = renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        await waitFor(() => {
            expect(playerInstance.attach).toHaveBeenCalled();
        });

        act(() => {
            result.current.setQuality(1);
        });

        expect(playerInstance.configure).toHaveBeenCalledWith({ abr: { enabled: false } });
        expect(playerInstance.selectVariantTrack).toHaveBeenCalled();
        expect(result.current.currentQuality).toBe(1);
    });

    it('setQuality with an out-of-range index does not select a track', async () => {
        playerInstance.getVariantTracks.mockReturnValue([
            { height: 720, bandwidth: 2500000 },
        ]);

        const { ref } = makeVideoRef();
        const { result } = renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        await waitFor(() => {
            expect(playerInstance.attach).toHaveBeenCalled();
        });

        playerInstance.selectVariantTrack.mockClear();

        act(() => {
            result.current.setQuality(99);
        });

        expect(playerInstance.selectVariantTrack).not.toHaveBeenCalled();
    });

    it('setQuality is a no-op when player has not initialised yet', () => {
        const { ref } = makeVideoRef();
        const { result } = renderHook(() => useShaka(ref, ''));

        expect(() => {
            act(() => {
                result.current.setQuality(0);
            });
        }).not.toThrow();
    });

    it('destroys the player on unmount', async () => {
        const { ref } = makeVideoRef();
        const { unmount } = renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        await waitFor(() => {
            expect(playerInstance.attach).toHaveBeenCalled();
        });

        unmount();

        expect(playerInstance.destroy).toHaveBeenCalled();
    });

    it('error event listener logs the error detail', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { ref } = makeVideoRef();
        renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        await waitFor(() => {
            expect(playerInstance.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
        });

        const errorCallback = playerInstance.addEventListener.mock.calls.find(
            (c: unknown[]) => c[0] === 'error',
        )?.[1] as (e: Event) => void;

        const detail = { code: 1001, message: 'Network error' };
        errorCallback(new CustomEvent('error', { detail }));

        expect(warnSpy).toHaveBeenCalledWith('[Shaka Error]', detail);
        warnSpy.mockRestore();
    });

    it('logs an error when init() rejects', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        playerInstance.load.mockRejectedValueOnce(new Error('load failed'));

        const { ref } = makeVideoRef();
        renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        await waitFor(() => {
            expect(errorSpy).toHaveBeenCalledWith('[Shaka Load Error]', expect.any(Error));
        });

        errorSpy.mockRestore();
    });

    it('uses height 0 and label "auto" when track has no height', async () => {
        playerInstance.getVariantTracks.mockReturnValue([
            { height: undefined, bandwidth: 500000 },
        ]);

        const { ref } = makeVideoRef();
        const { result } = renderHook(() => useShaka(ref, 'https://example.com/stream.mpd'));

        await waitFor(() => {
            expect(result.current.levels).toHaveLength(1);
        });

        expect(result.current.levels[0].height).toBe(0);
        expect(result.current.levels[0].label).toBe('auto');
    });
});

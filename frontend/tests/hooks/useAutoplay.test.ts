// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useAutoplay } from '@hooks/useAutoplay';
import { makeVideo, vid } from '../helpers/factories';

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        useNavigate: () => mockNavigate,
    };
});

const mockNavigate = vi.fn();

function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, null, children);
}

describe('useAutoplay', () => {
    const relatedVideos = [makeVideo({ id: vid('v-next') })];

    beforeEach(() => {
        vi.useFakeTimers();
        mockNavigate.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('initialises with autoplayCountdown = null', () => {
        const { result } = renderHook(
            () => useAutoplay({ id: 'v1', autoplay: true, relatedVideos: [] }),
            { wrapper },
        );
        expect(result.current.autoplayCountdown).toBeNull();
    });

    it('startAutoplayCountdown sets countdown to 5 when autoplay is enabled', () => {
        const { result } = renderHook(
            () => useAutoplay({ id: 'v1', autoplay: true, relatedVideos }),
            { wrapper },
        );

        act(() => {
            result.current.startAutoplayCountdown();
        });

        expect(result.current.autoplayCountdown).toBe(5);
    });

    it('does not start countdown when autoplay is disabled', () => {
        const { result } = renderHook(
            () => useAutoplay({ id: 'v1', autoplay: false, relatedVideos }),
            { wrapper },
        );

        act(() => {
            result.current.startAutoplayCountdown();
        });

        expect(result.current.autoplayCountdown).toBeNull();
    });

    it('does not start countdown when relatedVideos is empty', () => {
        const { result } = renderHook(
            () => useAutoplay({ id: 'v1', autoplay: true, relatedVideos: [] }),
            { wrapper },
        );

        act(() => {
            result.current.startAutoplayCountdown();
        });

        expect(result.current.autoplayCountdown).toBeNull();
    });

    it('decrements countdown every second', () => {
        const { result } = renderHook(
            () => useAutoplay({ id: 'v1', autoplay: true, relatedVideos }),
            { wrapper },
        );

        act(() => {
            result.current.startAutoplayCountdown();
        });

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.autoplayCountdown).toBe(4);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.autoplayCountdown).toBe(3);
    });

    it('navigates to next video when countdown reaches 0', () => {
        const { result } = renderHook(
            () => useAutoplay({ id: 'v1', autoplay: true, relatedVideos }),
            { wrapper },
        );

        act(() => {
            result.current.startAutoplayCountdown();
        });

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(mockNavigate).toHaveBeenCalledWith(`/watch?v=${relatedVideos[0].id}`);
        expect(result.current.autoplayCountdown).toBeNull();
    });

    it('cancelAutoplay stops the countdown', () => {
        const { result } = renderHook(
            () => useAutoplay({ id: 'v1', autoplay: true, relatedVideos }),
            { wrapper },
        );

        act(() => {
            result.current.startAutoplayCountdown();
        });

        act(() => {
            result.current.cancelAutoplay();
        });

        expect(result.current.autoplayCountdown).toBeNull();

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });
});

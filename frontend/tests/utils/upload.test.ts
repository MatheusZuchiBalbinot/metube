import { describe, it, expect, vi } from 'vitest';
import { buildProgress } from '@utils/upload';
import type { AxiosProgressEvent } from 'axios';

function makeEvent(loaded: number, total?: number): AxiosProgressEvent {
    return { loaded, total, bytes: loaded } as AxiosProgressEvent;
}

describe('buildProgress', () => {
    it('computes percent correctly when total is known', () => {
        const startTime = Date.now() - 1000;
        const result = buildProgress(makeEvent(50, 100), startTime);
        expect(result.percent).toBe(50);
    });

    it('returns percent = 0 when total is 0', () => {
        const startTime = Date.now() - 1000;
        const result = buildProgress(makeEvent(0, 0), startTime);
        expect(result.percent).toBe(0);
    });

    it('uses loaded as total when total is undefined', () => {
        const startTime = Date.now() - 1000;
        const result = buildProgress(makeEvent(100, undefined), startTime);
        // loaded === total → percent = 100
        expect(result.percent).toBe(100);
    });

    it('returns loaded and total in the result', () => {
        const startTime = Date.now() - 1000;
        const result = buildProgress(makeEvent(30, 90), startTime);
        expect(result.loaded).toBe(30);
        expect(result.total).toBe(90);
    });

    it('computes speed as bytes per second', () => {
        const startTime = Date.now() - 2000; // 2 seconds elapsed
        const result = buildProgress(makeEvent(2000, 4000), startTime);
        // speed ≈ 2000 / 2 = 1000 bytes/s (allow floating-point tolerance)
        expect(result.speed).toBeCloseTo(1000, -1);
    });

    it('returns speed = 0 when elapsed time is 0', () => {
        // Freeze time so the internal Date.now() can't tick past startTime.
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2000, 0, 1, 0, 0, 0, 0));
        const startTime = Date.now();
        const result = buildProgress(makeEvent(500, 1000), startTime);
        expect(result.speed).toBe(0);
        vi.useRealTimers();
    });

    it('computes remaining seconds based on speed', () => {
        const startTime = Date.now() - 1000; // 1 second elapsed, loaded = 1000
        const result = buildProgress(makeEvent(1000, 2000), startTime);
        // speed ≈ 1000 B/s, remaining bytes = 1000 → remaining ≈ 1s
        expect(result.remaining).toBeCloseTo(1, 0);
    });

    it('returns remaining = 0 when speed is 0', () => {
        const startTime = Date.now();
        const result = buildProgress(makeEvent(0, 1000), startTime);
        expect(result.remaining).toBe(0);
    });

    it('rounds percent to nearest integer', () => {
        const startTime = Date.now() - 1000;
        const result = buildProgress(makeEvent(1, 3), startTime);
        // 1/3 = 33.3... → rounds to 33
        expect(result.percent).toBe(33);
    });

    it('uses real Date.now via vi.setSystemTime for deterministic elapsed', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2000, 0, 1, 0, 0, 0, 0));
        const startTime = Date.now();
        vi.advanceTimersByTime(4000);
        const result = buildProgress(makeEvent(4000, 8000), startTime);
        // 4 seconds elapsed, 4000 bytes loaded → speed = 1000, remaining = 4
        expect(result.speed).toBeCloseTo(1000, -1);
        expect(result.remaining).toBeCloseTo(4, 0);
        vi.useRealTimers();
    });
});

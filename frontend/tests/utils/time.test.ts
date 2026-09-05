import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    formatDuration,
    formatDurationCompact,
    formatRelativeDate,
    formatEta,
    parseTimestamp,
    secondsToTimestamp,
    parseChapterTimestamp,
} from '@utils/time';

describe('formatDuration', () => {
    it('formats seconds-only', () => {
        expect(formatDuration(45)).toBe('0:45');
    });

    it('formats minutes and seconds', () => {
        expect(formatDuration(125)).toBe('2:05');
    });

    it('pads single-digit seconds', () => {
        expect(formatDuration(60 + 3)).toBe('1:03');
    });

    it('formats hours, minutes and seconds', () => {
        expect(formatDuration(3661)).toBe('1:01:01');
    });

    it('pads minutes when hours present', () => {
        expect(formatDuration(3600 + 5 * 60 + 9)).toBe('1:05:09');
    });

    it('floors decimal seconds', () => {
        expect(formatDuration(59.9)).toBe('0:59');
    });

    it('formats 0 seconds', () => {
        expect(formatDuration(0)).toBe('0:00');
    });

    it('returns 0:00 for negative input', () => {
        expect(formatDuration(-1)).toBe('0:00');
    });
});

describe('formatDurationCompact', () => {
    it('returns 0m for invalid input', () => {
        expect(formatDurationCompact(-1)).toBe('0m');
        expect(formatDurationCompact(NaN)).toBe('0m');
    });

    it('returns hours and minutes for long durations', () => {
        expect(formatDurationCompact(3661)).toBe('1h 1m');
    });

    it('returns minutes for < 1 hour', () => {
        expect(formatDurationCompact(125)).toBe('2m');
    });

    it('returns <1m for very short durations', () => {
        expect(formatDurationCompact(45)).toBe('<1m');
    });
});

describe('formatRelativeDate', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns "now" / seconds ago for very recent dates', () => {
        const isoDate = new Date(Date.now() - 30_000).toISOString();
        expect(formatRelativeDate(isoDate, 'en')).toMatch(/second/i);
    });

    it('returns minutes ago', () => {
        const isoDate = new Date(Date.now() - 5 * 60_000).toISOString();
        expect(formatRelativeDate(isoDate, 'en')).toMatch(/minute/i);
    });

    it('returns hours ago', () => {
        const isoDate = new Date(Date.now() - 3 * 3600_000).toISOString();
        expect(formatRelativeDate(isoDate, 'en')).toMatch(/hour/i);
    });

    it('returns days ago', () => {
        const isoDate = new Date(Date.now() - 3 * 86400_000).toISOString();
        expect(formatRelativeDate(isoDate, 'en')).toMatch(/day/i);
    });

    it('returns weeks ago', () => {
        const isoDate = new Date(Date.now() - 14 * 86400_000).toISOString();
        expect(formatRelativeDate(isoDate, 'en')).toMatch(/week/i);
    });

    it('returns months ago', () => {
        const isoDate = new Date(Date.now() - 60 * 86400_000).toISOString();
        expect(formatRelativeDate(isoDate, 'en')).toMatch(/month/i);
    });

    it('returns years ago', () => {
        const isoDate = new Date(Date.now() - 400 * 86400_000).toISOString();
        expect(formatRelativeDate(isoDate, 'en')).toMatch(/year/i);
    });

    it('falls back to now when isoDate is null', () => {
        const result = formatRelativeDate(null, 'en');
        expect(result).toMatch(/second|now/i);
    });
});

describe('formatEta', () => {
    it('returns empty string for non-positive seconds', () => {
        expect(formatEta(0)).toBe('');
        expect(formatEta(-5)).toBe('');
    });

    it('returns seconds remaining for < 60s', () => {
        const result = formatEta(30);
        expect(result).toMatch(/second/i);
        expect(result).toContain('left');
    });

    it('returns minutes remaining for < 3600s', () => {
        const result = formatEta(120);
        expect(result).toMatch(/minute/i);
        expect(result).toContain('left');
    });

    it('returns hours remaining for >= 3600s', () => {
        const result = formatEta(7200);
        expect(result).toMatch(/hour/i);
        expect(result).toContain('left');
    });
});

describe('parseTimestamp', () => {
    it('parses mm:ss format', () => {
        expect(parseTimestamp('1:30')).toBe(90);
    });

    it('parses hh:mm:ss format', () => {
        expect(parseTimestamp('1:02:03')).toBe(3723);
    });

    it('returns 0 for invalid input', () => {
        expect(parseTimestamp('not:a:time')).toBe(0);
    });

    it('returns 0 for single segment', () => {
        expect(parseTimestamp('42')).toBe(0);
    });
});

describe('secondsToTimestamp', () => {
    it('formats as mm:ss when no hours', () => {
        expect(secondsToTimestamp(90)).toBe('1:30');
    });

    it('formats as h:mm:ss when >= 1 hour', () => {
        expect(secondsToTimestamp(3723)).toBe('1:02:03');
    });

    it('handles 0 seconds', () => {
        expect(secondsToTimestamp(0)).toBe('0:00');
    });

    it('clamps negative to 0', () => {
        expect(secondsToTimestamp(-5)).toBe('0:00');
    });
});

describe('parseChapterTimestamp', () => {
    it('parses mm:ss format', () => {
        expect(parseChapterTimestamp('2:30')).toBe(150);
    });

    it('parses hh:mm:ss format', () => {
        expect(parseChapterTimestamp('1:02:03')).toBe(3723);
    });
});

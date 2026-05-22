import { describe, it, expect } from 'vitest';
import { isVideoFile, isImageFile, exceedsMaxSize, isValidEmail, isValidUrl } from '@utils/validate';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name: string, type: string, sizeBytes = 1000): File {
    return new File(['x'.repeat(sizeBytes)], name, { type });
}

// ─── isVideoFile ──────────────────────────────────────────────────────────────

describe('isVideoFile', () => {
    it('returns true for video/mp4', () => {
        expect(isVideoFile(makeFile('a.mp4', 'video/mp4'))).toBe(true);
    });

    it('returns true for video/webm', () => {
        expect(isVideoFile(makeFile('a.webm', 'video/webm'))).toBe(true);
    });

    it('returns true for video/ogg', () => {
        expect(isVideoFile(makeFile('a.ogg', 'video/ogg'))).toBe(true);
    });

    it('returns true for video/quicktime', () => {
        expect(isVideoFile(makeFile('a.mov', 'video/quicktime'))).toBe(true);
    });

    it('returns true for video/x-msvideo', () => {
        expect(isVideoFile(makeFile('a.avi', 'video/x-msvideo'))).toBe(true);
    });

    it('returns true for video/x-matroska', () => {
        expect(isVideoFile(makeFile('a.mkv', 'video/x-matroska'))).toBe(true);
    });

    it('returns false for image/jpeg', () => {
        expect(isVideoFile(makeFile('a.jpg', 'image/jpeg'))).toBe(false);
    });

    it('returns false for application/pdf', () => {
        expect(isVideoFile(makeFile('a.pdf', 'application/pdf'))).toBe(false);
    });

    it('returns false for empty type', () => {
        expect(isVideoFile(makeFile('a.bin', ''))).toBe(false);
    });
});

// ─── isImageFile ──────────────────────────────────────────────────────────────

describe('isImageFile', () => {
    it('returns true for image/jpeg', () => {
        expect(isImageFile(makeFile('a.jpg', 'image/jpeg'))).toBe(true);
    });

    it('returns true for image/png', () => {
        expect(isImageFile(makeFile('a.png', 'image/png'))).toBe(true);
    });

    it('returns true for image/gif', () => {
        expect(isImageFile(makeFile('a.gif', 'image/gif'))).toBe(true);
    });

    it('returns true for image/webp', () => {
        expect(isImageFile(makeFile('a.webp', 'image/webp'))).toBe(true);
    });

    it('returns true for image/svg+xml', () => {
        expect(isImageFile(makeFile('a.svg', 'image/svg+xml'))).toBe(true);
    });

    it('returns false for video/mp4', () => {
        expect(isImageFile(makeFile('a.mp4', 'video/mp4'))).toBe(false);
    });

    it('returns false for empty type', () => {
        expect(isImageFile(makeFile('a.bin', ''))).toBe(false);
    });
});

// ─── exceedsMaxSize ───────────────────────────────────────────────────────────

describe('exceedsMaxSize', () => {
    it('returns false when file size is exactly at the limit', () => {
        const maxMB = 1;
        const file = makeFile('a.mp4', 'video/mp4', 1 * 1_048_576);
        expect(exceedsMaxSize(file, maxMB)).toBe(false);
    });

    it('returns true when file size exceeds the limit by one byte', () => {
        const maxMB = 1;
        const file = makeFile('a.mp4', 'video/mp4', 1 * 1_048_576 + 1);
        expect(exceedsMaxSize(file, maxMB)).toBe(true);
    });

    it('returns false for a small file against a large limit', () => {
        const file = makeFile('a.mp4', 'video/mp4', 500);
        expect(exceedsMaxSize(file, 100)).toBe(false);
    });

    it('handles fractional MB limits', () => {
        const file = makeFile('a.mp4', 'video/mp4', 1_048_577);
        expect(exceedsMaxSize(file, 0.5)).toBe(true);
    });
});

// ─── isValidEmail ─────────────────────────────────────────────────────────────

describe('isValidEmail', () => {
    it('returns true for a standard email', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('returns true for email with subdomain', () => {
        expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('returns true for email with plus alias', () => {
        expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('returns false for email without @', () => {
        expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('returns false for email without domain', () => {
        expect(isValidEmail('user@')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isValidEmail('')).toBe(false);
    });

    it('returns false for email with spaces', () => {
        expect(isValidEmail('user @example.com')).toBe(false);
    });

    it('returns false for plain text', () => {
        expect(isValidEmail('notanemail')).toBe(false);
    });
});

// ─── isValidUrl ───────────────────────────────────────────────────────────────

describe('isValidUrl', () => {
    it('returns true for http url', () => {
        expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('returns true for https url', () => {
        expect(isValidUrl('https://example.com/path?q=1')).toBe(true);
    });

    it('returns false for ftp url', () => {
        expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('returns false for plain text', () => {
        expect(isValidUrl('not a url')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isValidUrl('')).toBe(false);
    });

    it('returns false for url without protocol', () => {
        expect(isValidUrl('example.com')).toBe(false);
    });

    it('returns false for javascript: protocol', () => {
        expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });
});

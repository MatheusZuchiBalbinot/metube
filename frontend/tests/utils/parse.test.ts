import { describe, it, expect } from 'vitest';
import { parseTags, fileExtension, isUuid } from '@utils/parse';

describe('parseTags', () => {
    it('returns empty array for null', () => {
        expect(parseTags(null)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
        expect(parseTags('')).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
        expect(parseTags('   ')).toEqual([]);
    });

    it('splits comma-separated tags', () => {
        expect(parseTags('php,laravel,react')).toEqual(['php', 'laravel', 'react']);
    });

    it('trims whitespace around tags', () => {
        expect(parseTags(' php , laravel , react ')).toEqual(['php', 'laravel', 'react']);
    });

    it('filters out empty segments from consecutive commas', () => {
        expect(parseTags('php,,react')).toEqual(['php', 'react']);
    });

    it('returns single tag without comma', () => {
        expect(parseTags('typescript')).toEqual(['typescript']);
    });
});

describe('fileExtension', () => {
    it('returns lowercase extension for uppercase input', () => {
        expect(fileExtension('video.MP4')).toBe('mp4');
    });

    it('returns extension for normal file', () => {
        expect(fileExtension('document.pdf')).toBe('pdf');
    });

    it('returns empty string when no extension', () => {
        expect(fileExtension('README')).toBe('');
    });

    it('returns empty string for filename ending with dot', () => {
        expect(fileExtension('file.')).toBe('');
    });

    it('returns last extension for multiple dots', () => {
        expect(fileExtension('archive.tar.gz')).toBe('gz');
    });

    it('returns extension portion of dot-prefixed file', () => {
        expect(fileExtension('.gitignore')).toBe('gitignore');
    });
});

describe('isUuid', () => {
    it('returns true for a valid UUID v4', () => {
        expect(isUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('returns false for empty string', () => {
        expect(isUuid('')).toBe(false);
    });

    it('returns false for a short random string (vuid)', () => {
        expect(isUuid('xA3b9kZmWqL')).toBe(false);
    });

    it('returns false for a string with wrong version digit', () => {
        expect(isUuid('f47ac10b-58cc-3372-a567-0e02b2c3d479')).toBe(false);
    });

    it('returns false for a string with wrong variant bits', () => {
        expect(isUuid('f47ac10b-58cc-4372-e567-0e02b2c3d479')).toBe(false);
    });

    it('is case-insensitive', () => {
        expect(isUuid('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true);
    });
});

import { describe, it, expect } from 'vitest';
import { TagColors } from '@utils/tagColors';

describe('TagColors.palette — determinism', () => {
    it('returns the same palette for the same tag called twice', () => {
        const a = TagColors.palette('react');
        const b = TagColors.palette('react');
        expect(a).toBe(b);
    });

    it('returns the same palette for a long tag called twice', () => {
        const tag = 'this-is-a-very-long-tag-name-with-many-characters';
        expect(TagColors.palette(tag)).toBe(TagColors.palette(tag));
    });
});

describe('TagColors.palette — valid shape', () => {
    it('returns an object with a bg string', () => {
        const palette = TagColors.palette('typescript');
        expect(typeof palette.bg).toBe('string');
        expect(palette.bg.length).toBeGreaterThan(0);
    });

    it('returns an object with a color string', () => {
        const palette = TagColors.palette('typescript');
        expect(typeof palette.color).toBe('string');
        expect(palette.color.length).toBeGreaterThan(0);
    });
});

describe('TagColors.palette — edge cases', () => {
    it('does not throw for an empty string', () => {
        expect(() => TagColors.palette('')).not.toThrow();
    });

    it('returns a valid palette for an empty string', () => {
        const palette = TagColors.palette('');
        expect(typeof palette.bg).toBe('string');
        expect(typeof palette.color).toBe('string');
    });

    it('returns different palettes for clearly distinct tags', () => {
        const tags = ['react', 'css', 'node', 'docker', 'postgres', 'redis'];
        const palettes = tags.map(t => TagColors.palette(t));
        const unique = new Set(palettes.map(p => p.color));
        expect(unique.size).toBeGreaterThan(1);
    });
});

import { describe, it, expect } from 'vitest';
import { THEME_MODES, THEME_COLORS } from '@utils/themes';
import type { ThemeMode, ThemeColor } from '@utils/themes';

describe('THEME_MODES', () => {
    it('contains "dark"', () => {
        expect(THEME_MODES).toContain('dark');
    });

    it('contains "light"', () => {
        expect(THEME_MODES).toContain('light');
    });

    it('has exactly 2 entries', () => {
        expect(THEME_MODES).toHaveLength(2);
    });

    it('all entries are non-empty strings', () => {
        for (const mode of THEME_MODES) {
            expect(typeof mode).toBe('string');
            expect(mode.length).toBeGreaterThan(0);
        }
    });

    it('all entries are unique', () => {
        const unique = new Set(THEME_MODES);
        expect(unique.size).toBe(THEME_MODES.length);
    });
});

describe('THEME_COLORS', () => {
    it('contains "violet"', () => {
        expect(THEME_COLORS).toContain('violet');
    });

    it('contains "blue"', () => {
        expect(THEME_COLORS).toContain('blue');
    });

    it('contains "green"', () => {
        expect(THEME_COLORS).toContain('green');
    });

    it('contains "rose"', () => {
        expect(THEME_COLORS).toContain('rose');
    });

    it('contains "amber"', () => {
        expect(THEME_COLORS).toContain('amber');
    });

    it('has exactly 5 entries', () => {
        expect(THEME_COLORS).toHaveLength(5);
    });

    it('all entries are non-empty strings', () => {
        for (const color of THEME_COLORS) {
            expect(typeof color).toBe('string');
            expect(color.length).toBeGreaterThan(0);
        }
    });

    it('all entries are unique', () => {
        const unique = new Set(THEME_COLORS);
        expect(unique.size).toBe(THEME_COLORS.length);
    });
});

describe('ThemeMode type', () => {
    it('accepts valid mode values', () => {
        const dark: ThemeMode = 'dark';
        const light: ThemeMode = 'light';
        expect(THEME_MODES).toContain(dark);
        expect(THEME_MODES).toContain(light);
    });
});

describe('ThemeColor type', () => {
    it('accepts valid color values', () => {
        const violet: ThemeColor = 'violet';
        const amber: ThemeColor = 'amber';
        expect(THEME_COLORS).toContain(violet);
        expect(THEME_COLORS).toContain(amber);
    });
});

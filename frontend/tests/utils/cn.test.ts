import { describe, it, expect } from 'vitest';
import { cn } from '@utils/cn';

describe('cn', () => {
    it('returns a single class unchanged', () => {
        expect(cn('foo')).toBe('foo');
    });

    it('merges multiple classes into a single string', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('filters out falsy values', () => {
        expect(cn('foo', false, undefined, null, '', 'bar')).toBe('foo bar');
    });

    it('handles conditional object syntax', () => {
        expect(cn({ active: true, hidden: false })).toBe('active');
    });

    it('handles array inputs', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('deduplicates conflicting tailwind classes (last wins)', () => {
        const result = cn('p-2', 'p-4');
        expect(result).toBe('p-4');
    });

    it('merges tailwind background colors correctly', () => {
        const result = cn('bg-red-500', 'bg-blue-500');
        expect(result).toBe('bg-blue-500');
    });

    it('returns empty string when given no arguments', () => {
        expect(cn()).toBe('');
    });

    it('returns empty string when all values are falsy', () => {
        expect(cn(false, undefined, null, '')).toBe('');
    });

    it('handles mixed conditional objects and strings', () => {
        const isActive = true;
        const isDisabled = false;
        const result = cn('btn', { 'btn--active': isActive, 'btn--disabled': isDisabled });
        expect(result).toBe('btn btn--active');
    });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadFromStorage, isObject, isArray, isNumberInRange } from '@utils/loadFromStorage';

beforeEach(() => {
    localStorage.clear();
});

// ─── loadFromStorage ───────────────────────────────────────────────────────────

describe('loadFromStorage — missing key', () => {
    it('returns the seed when key does not exist', () => {
        const result = loadFromStorage('test-key', [1, 2, 3]);
        expect(result).toEqual([1, 2, 3]);
    });

    it('persists the seed to storage when key is missing', () => {
        loadFromStorage('test-key', 42);
        expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(42);
    });
});

describe('loadFromStorage — existing key', () => {
    it('returns the parsed value when key exists and no validator is given', () => {
        localStorage.setItem('test-key', JSON.stringify({ foo: 'bar' }));
        const result = loadFromStorage('test-key', {});
        expect(result).toEqual({ foo: 'bar' });
    });

    it('returns the parsed value when validator passes', () => {
        localStorage.setItem('test-key', JSON.stringify([1, 2]));
        const result = loadFromStorage('test-key', [], isArray);
        expect(result).toEqual([1, 2]);
    });

    it('returns seed when stored value fails validation', () => {
        localStorage.setItem('test-key', JSON.stringify('not-an-array'));
        const result = loadFromStorage('test-key', [99], isArray);
        expect(result).toEqual([99]);
    });

    it('overwrites storage with seed when validation fails', () => {
        localStorage.setItem('test-key', JSON.stringify('invalid'));
        loadFromStorage('test-key', [99], isArray);
        expect(JSON.parse(localStorage.getItem('test-key')!)).toEqual([99]);
    });
});

describe('loadFromStorage — corrupted JSON', () => {
    it('returns seed when stored value is not valid JSON', () => {
        localStorage.setItem('test-key', 'not-json{{');
        const result = loadFromStorage('test-key', 'fallback');
        expect(result).toBe('fallback');
    });
});

// ─── loadFromStorage — storage unavailable ──────────────────────────────────
//
// getItem throwing (quota exceeded / storage blocked, e.g. Safari private mode)
// used to fall into a catch block that called the very same throwing setItem API,
// producing a second, unhandled error. Since this runs at module-evaluation time
// for several slices' initialState, that crashed the whole app on load.

describe('loadFromStorage — storage unavailable', () => {
    it('does not throw when both getItem and setItem throw', () => {
        const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('SecurityError');
        });
        const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError');
        });

        let result: unknown;
        expect(() => {
            result = loadFromStorage('test-key', 'fallback');
        }).not.toThrow();
        expect(result).toBe('fallback');

        getSpy.mockRestore();
        setSpy.mockRestore();
    });

    it('still returns the seed when only setItem throws on a missing key', () => {
        const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError');
        });

        let result: unknown;
        expect(() => {
            result = loadFromStorage('missing-key', ['seed']);
        }).not.toThrow();
        expect(result).toEqual(['seed']);

        setSpy.mockRestore();
    });
});

// ─── isObject ─────────────────────────────────────────────────────────────────

describe('isObject', () => {
    it('returns true for a plain object', () => {
        expect(isObject({ a: 1 })).toBe(true);
    });

    it('returns false for an array', () => {
        expect(isObject([])).toBe(false);
    });

    it('returns false for null', () => {
        expect(isObject(null)).toBe(false);
    });

    it('returns false for a string', () => {
        expect(isObject('hello')).toBe(false);
    });

    it('returns false for a number', () => {
        expect(isObject(42)).toBe(false);
    });
});

// ─── isArray ──────────────────────────────────────────────────────────────────

describe('isArray', () => {
    it('returns true for an array', () => {
        expect(isArray([1, 2, 3])).toBe(true);
    });

    it('returns true for an empty array', () => {
        expect(isArray([])).toBe(true);
    });

    it('returns false for a plain object', () => {
        expect(isArray({ length: 1 })).toBe(false);
    });

    it('returns false for null', () => {
        expect(isArray(null)).toBe(false);
    });
});

// ─── isNumberInRange ──────────────────────────────────────────────────────────

describe('isNumberInRange', () => {
    it('returns true for a number inside the range', () => {
        expect(isNumberInRange(0, 100)(50)).toBe(true);
    });

    it('returns true for a number at the minimum boundary', () => {
        expect(isNumberInRange(0, 1)(0)).toBe(true);
    });

    it('returns true for a number at the maximum boundary', () => {
        expect(isNumberInRange(0, 1)(1)).toBe(true);
    });

    it('returns false for a number below the minimum', () => {
        expect(isNumberInRange(0, 100)(-1)).toBe(false);
    });

    it('returns false for a number above the maximum', () => {
        expect(isNumberInRange(0, 100)(101)).toBe(false);
    });

    it('returns false for a string', () => {
        expect(isNumberInRange(0, 100)('50')).toBe(false);
    });
});

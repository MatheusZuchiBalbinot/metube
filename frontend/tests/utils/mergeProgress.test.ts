import { describe, it, expect } from 'vitest';
import { mergeProgress } from '@utils/mergeProgress';

describe('mergeProgress', () => {
    it('returns backend progress when local is empty', () => {
        const result = mergeProgress({}, { 'v-abc': 40, 'v-xyz': 80 });

        expect(result).toEqual({ 'v-abc': 40, 'v-xyz': 80 });
    });

    it('keeps local value when it is ahead of backend', () => {
        const result = mergeProgress({ 'v-abc': 60 }, { 'v-abc': 40 });

        expect(result['v-abc']).toBe(60);
    });

    it('uses backend value when it is ahead of local', () => {
        const result = mergeProgress({ 'v-abc': 30 }, { 'v-abc': 75 });

        expect(result['v-abc']).toBe(75);
    });

    it('fills in backend videos that local has no record of', () => {
        const result = mergeProgress({ 'v-abc': 50 }, { 'v-abc': 40, 'v-xyz': 90 });

        expect(result['v-abc']).toBe(50);
        expect(result['v-xyz']).toBe(90);
    });

    it('includes local videos that backend has no record of', () => {
        const result = mergeProgress({ 'v-local-only': 55 }, { 'v-backend': 70 });

        expect(result['v-local-only']).toBe(55);
        expect(result['v-backend']).toBe(70);
    });
});

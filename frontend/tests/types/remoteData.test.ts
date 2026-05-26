import { describe, it, expect } from 'vitest';
import { RemoteData } from '@models';

describe('RemoteData', () => {
    it('idle() returns { kind: "idle" }', () => {
        expect(RemoteData.idle()).toEqual({ kind: 'idle' });
    });

    it('loading() returns { kind: "loading" }', () => {
        expect(RemoteData.loading()).toEqual({ kind: 'loading' });
    });

    it('ok(data) wraps the data', () => {
        const result = RemoteData.ok([1, 2, 3]);
        expect(result.kind).toBe('ok');
        if (result.kind === 'ok') {
            expect(result.data).toEqual([1, 2, 3]);
        }
    });

    it('error(message) wraps the message', () => {
        const result = RemoteData.error('Network down');
        expect(result.kind).toBe('error');
        if (result.kind === 'error') {
            expect(result.message).toBe('Network down');
        }
    });
});

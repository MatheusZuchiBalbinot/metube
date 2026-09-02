import { describe, it, expect } from 'vitest';
import { isStaleBroadcast } from '@utils/broadcastStaleness';

describe('isStaleBroadcast', () => {
    it('treats the first broadcast for a key as fresh', () => {
        const seen = new Map<string, number>();

        expect(isStaleBroadcast(seen, 'v-1', 1000)).toBe(false);
        expect(seen.get('v-1')).toBe(1000);
    });

    it('treats a broadcast without emitted_at_ms as always fresh', () => {
        const seen = new Map<string, number>();
        seen.set('v-1', 2000);

        expect(isStaleBroadcast(seen, 'v-1', undefined)).toBe(false);
    });

    it('drops a broadcast older than the last applied one', () => {
        const seen = new Map<string, number>();
        seen.set('v-1', 2000);

        expect(isStaleBroadcast(seen, 'v-1', 1000)).toBe(true);
        expect(seen.get('v-1')).toBe(2000);
    });

    it('accepts a broadcast newer than the last applied one and records it', () => {
        const seen = new Map<string, number>();
        seen.set('v-1', 1000);

        expect(isStaleBroadcast(seen, 'v-1', 2000)).toBe(false);
        expect(seen.get('v-1')).toBe(2000);
    });

    it('tracks staleness independently per key', () => {
        const seen = new Map<string, number>();
        seen.set('v-1', 2000);

        expect(isStaleBroadcast(seen, 'v-2', 1000)).toBe(false);
        expect(seen.get('v-2')).toBe(1000);
    });
});

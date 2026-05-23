// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getSessionId } from '@utils/sessionId';

describe('getSessionId', () => {
    beforeEach(() => {
        window.sessionStorage.clear();
    });

    it('persists the same id across calls within one session', () => {
        const first = getSessionId();
        const second = getSessionId();

        expect(first).toBe(second);
        expect(first.length).toBeGreaterThan(0);
    });

    it('returns the value previously stored in sessionStorage', () => {
        window.sessionStorage.setItem('analytics:sessionId', 'fixed-id');

        expect(getSessionId()).toBe('fixed-id');
    });

    it('creates a new id and persists it when sessionStorage is empty', () => {
        window.sessionStorage.clear();
        const id = getSessionId();
        expect(id.length).toBeGreaterThan(0);
        expect(window.sessionStorage.getItem('analytics:sessionId')).toBe(id);
    });
});

describe('getSessionId — crypto fallback', () => {
    it('falls back to manual id when crypto.randomUUID is not available', () => {
        const originalUUID = crypto.randomUUID;
        // @ts-expect-error — intentionally removing for test
        delete crypto.randomUUID;
        window.sessionStorage.clear();
        const id = getSessionId();
        expect(id.length).toBeGreaterThan(0);
        // Restore
        crypto.randomUUID = originalUUID;
    });
});

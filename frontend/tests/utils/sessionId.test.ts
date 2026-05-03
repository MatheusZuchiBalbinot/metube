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
});

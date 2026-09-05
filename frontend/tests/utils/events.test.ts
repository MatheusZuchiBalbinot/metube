import { describe, it, expect } from 'vitest';
import { APP_EVENTS } from '@utils/events';

describe('APP_EVENTS', () => {
    it('has a SESSION_EXPIRED event string', () => {
        expect(APP_EVENTS.SESSION_EXPIRED).toBe('auth:session-expired');
    });

    it('has a FORBIDDEN event string', () => {
        expect(APP_EVENTS.FORBIDDEN).toBe('auth:forbidden');
    });

    it('has a SERVICE_UNAVAILABLE event string', () => {
        expect(APP_EVENTS.SERVICE_UNAVAILABLE).toBe('app:service-unavailable');
    });

    it('has an OPEN_SHORTCUTS event string', () => {
        expect(APP_EVENTS.OPEN_SHORTCUTS).toBe('app:open-shortcuts');
    });

    it('contains exactly the expected keys', () => {
        const keys = Object.keys(APP_EVENTS);
        expect(keys).toEqual(['SESSION_EXPIRED', 'FORBIDDEN', 'SERVICE_UNAVAILABLE', 'OPEN_SHORTCUTS']);
    });

    it('all event strings are unique', () => {
        const values = Object.values(APP_EVENTS);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
    });

    it('all event strings are non-empty', () => {
        for (const value of Object.values(APP_EVENTS)) {
            expect(value.length).toBeGreaterThan(0);
        }
    });
});

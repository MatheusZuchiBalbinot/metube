import { describe, it, expect, vi } from 'vitest';
import { bindRealtimeReconnect } from '@utils/realtimeReconnect';

function makeConnection() {
    const handlers = new Map<string, (states: { previous: string; current: string }) => void>();

    return {
        bind: vi.fn((event: string, cb: (states: { previous: string; current: string }) => void) => {
            handlers.set(event, cb);
        }),
        unbind: vi.fn((event: string) => {
            handlers.delete(event);
        }),
        emit(states: { previous: string; current: string }) {
            handlers.get('state_change')?.(states);
        },
    };
}

describe('bindRealtimeReconnect', () => {
    it('does not call onReconnect on the initial connect', () => {
        const connection = makeConnection();
        const onReconnect = vi.fn();
        bindRealtimeReconnect(connection, onReconnect);

        connection.emit({ previous: 'connecting', current: 'connected' });

        expect(onReconnect).not.toHaveBeenCalled();
    });

    it('calls onReconnect when reconnecting after a drop', () => {
        const connection = makeConnection();
        const onReconnect = vi.fn();
        bindRealtimeReconnect(connection, onReconnect);

        connection.emit({ previous: 'connecting', current: 'connected' });
        connection.emit({ previous: 'connected', current: 'unavailable' });
        connection.emit({ previous: 'unavailable', current: 'connected' });

        expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it('does not call onReconnect for a non-connected state', () => {
        const connection = makeConnection();
        const onReconnect = vi.fn();
        bindRealtimeReconnect(connection, onReconnect);

        connection.emit({ previous: 'connecting', current: 'connected' });
        connection.emit({ previous: 'connected', current: 'unavailable' });

        expect(onReconnect).not.toHaveBeenCalled();
    });

    it('returns an unbind function that removes the listener', () => {
        const connection = makeConnection();
        const unbind = bindRealtimeReconnect(connection, vi.fn());

        unbind();

        expect(connection.unbind).toHaveBeenCalledWith('state_change', expect.any(Function));
    });
});

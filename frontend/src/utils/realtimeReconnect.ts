interface PusherConnectionLike {
    bind: (event: string, callback: (states: { previous: string; current: string }) => void) => void
    unbind: (event: string, callback: (states: { previous: string; current: string }) => void) => void
}

// Calls onReconnect on every 'connected' state after the first — never the initial connect.
export function bindRealtimeReconnect(connection: PusherConnectionLike, onReconnect: () => void): () => void {
    let hasConnectedBefore = false;

    function handleConnectionStateChange(states: { previous: string; current: string }): void {
        const isReconnect = states.current === 'connected' && hasConnectedBefore;

        if (isReconnect) {
            onReconnect();
        }

        hasConnectedBefore = hasConnectedBefore || states.current === 'connected';
    }

    connection.bind('state_change', handleConnectionStateChange);

    return () => connection.unbind('state_change', handleConnectionStateChange);
}

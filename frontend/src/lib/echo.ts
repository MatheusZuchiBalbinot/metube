import type Echo from 'laravel-echo';
import type { ChannelAuthorizationCallback } from 'pusher-js';
import axios from 'axios';

declare global {
    interface Window {
        Pusher: unknown;
    }
}

let echoInstance: Echo<'reverb'> | null = null;

export async function getEcho(): Promise<Echo<'reverb'> | null> {
    if (echoInstance) {
        return echoInstance;
    }

    const appKey = import.meta.env.VITE_REVERB_APP_KEY as string | undefined;
    const isConfigured = Boolean(appKey);

    if (!isConfigured) {
        if (import.meta.env.DEV) {
            console.warn(
                '[echo] VITE_REVERB_APP_KEY is not set — realtime notifications are disabled. '
                + 'Copy frontend/.env.example to frontend/.env and set it to REVERB_APP_KEY from backend/.env.',
            );
        }

        return null;
    }

    const [{ default: EchoClass }, { default: Pusher }] = await Promise.all([
        import('laravel-echo'),
        import('pusher-js'),
    ]);

    window.Pusher = Pusher;

    echoInstance = new EchoClass({
        broadcaster: 'reverb',
        key: appKey,
        wsHost: import.meta.env.VITE_REVERB_HOST as string,
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        // Use axios so X-XSRF-TOKEN is sent automatically (Pusher's built-in
        // XHR does not read the cookie, causing 419 CSRF errors).
        authorizer: (channel: { name: string }) => ({
            authorize: (socketId: string, callback: ChannelAuthorizationCallback) => {
                axios.post('/api/broadcasting/auth', {
                    socket_id: socketId,
                    channel_name: channel.name,
                }, { withCredentials: true })
                    .then(response => callback(null, response.data as Parameters<ChannelAuthorizationCallback>[1]))
                    .catch((error: Error) => callback(error, null));
            },
        }),
    });

    return echoInstance;
}

export function destroyEcho(): void {
    echoInstance?.disconnect();
    echoInstance = null;
}

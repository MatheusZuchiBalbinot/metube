import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

let echoInstance: Echo<'reverb'> | null = null;

function getEcho(): Echo<'reverb'> | null {
    if (echoInstance) {
        return echoInstance;
    }

    const appKey = import.meta.env.VITE_REVERB_APP_KEY as string | undefined;
    const isConfigured = Boolean(appKey);

    if (!isConfigured) {
        return null;
    }

    window.Pusher = Pusher;

    echoInstance = new Echo({
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
            authorize: (socketId: string, callback: (error: Error | null, data: unknown) => void) => {
                axios.post('/api/broadcasting/auth', {
                    socket_id: socketId,
                    channel_name: channel.name,
                }, { withCredentials: true })
                    .then(response => callback(null, response.data))
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

export default getEcho;

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
        authEndpoint: '/api/broadcasting/auth',
        withCredentials: true,
    });

    return echoInstance;
}

export function destroyEcho(): void {
    echoInstance?.disconnect();
    echoInstance = null;
}

export default getEcho;

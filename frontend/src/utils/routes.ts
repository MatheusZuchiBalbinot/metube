export const ROUTES = {
    LOGIN:       '/login',
    HOME:        '/',
    SHORTS:      '/shorts',
    HISTORY:     '/history',
    PLAYLISTS:   '/playlists',
    WATCH_LATER: '/watch-later',
    LIKED:       '/liked',
    PROFILE:     '/profile',
    USER:        '/user/:id',
    VIDEO:       '/watch',
    SEARCH:      '/search',
    CHANNEL:     '/channel/:id',
} as const;

export function videoUrl(vuid: string): string {
    return `/watch?v=${vuid}`;
}

export const ROUTES = {
    LOGIN:          '/login',
    SIGNUP:         '/signup',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD:  '/reset-password/:token',
    HOME:           '/',
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
    INSIGHTS:    '/insights',
} as const;

export function videoUrl(vuid: string): string {
    return `/watch?v=${vuid}`;
}

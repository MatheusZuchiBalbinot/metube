const STORAGE_KEY = 'analytics:sessionId';

function generateSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getSessionId(): string {
    if (typeof window === 'undefined') {
        return 'ssr';
    }

    const existing = window.sessionStorage.getItem(STORAGE_KEY);

    if (existing !== null && existing !== '') {
        return existing;
    }

    const created = generateSessionId();
    window.sessionStorage.setItem(STORAGE_KEY, created);
    return created;
}

const viewedThisSession = new Set<string>();

export function markViewed(videoId: string): void {
    viewedThisSession.add(videoId);
}

export function hasViewed(videoId: string): boolean {
    return viewedThisSession.has(videoId);
}

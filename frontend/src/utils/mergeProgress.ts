/**
 * Merges local and backend video progress.
 *
 * Local wins when it has a higher value (more recent playback).
 * Backend fills in videos that local has no data for.
 */
export function mergeProgress(
    local: Record<string, number>,
    backend: Record<string, number>,
): Record<string, number> {
    const merged: Record<string, number> = { ...backend };

    for (const [vuid, localPct] of Object.entries(local)) {
        const backendPct = backend[vuid] ?? 0;
        const isLocalAhead = localPct > backendPct;

        if (isLocalAhead) {
            merged[vuid] = localPct;
        }
    }

    return merged;
}

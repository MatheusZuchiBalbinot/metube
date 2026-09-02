// Records emittedAtMs for key and returns true if it's older than the last applied value.
export function isStaleBroadcast(lastByKey: Map<string, number>, key: string, emittedAtMs: number | undefined): boolean {
    if (emittedAtMs === undefined) {
        return false;
    }

    const lastAppliedMs = lastByKey.get(key);
    const isStale = lastAppliedMs !== undefined && emittedAtMs < lastAppliedMs;

    if (isStale) {
        return true;
    }

    lastByKey.set(key, emittedAtMs);

    return false;
}

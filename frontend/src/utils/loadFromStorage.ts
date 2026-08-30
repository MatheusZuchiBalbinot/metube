/**
 * Writes to localStorage without throwing.
 *
 * `localStorage.setItem` can throw (quota exceeded, storage blocked — e.g.
 * Safari private mode). Callers that write from a `catch` block after a
 * failed `getItem`/`setItem` must not call the same throwing API again, or
 * the new error goes completely unhandled.
 */
function safeSet(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // storage unavailable — degrade to in-memory only
    }
}

/**
 * Safely loads and validates a value from localStorage.
 *
 * If the key is missing, the seed value is written and returned.
 * If the stored value fails JSON parsing or the optional validator, the seed
 * is written and returned so callers always get a type-safe value.
 */
export function loadFromStorage<T>(
    key: string,
    seed: T,
    validate?: (v: unknown) => boolean,
): T {
    try {
        const raw = localStorage.getItem(key);
        const isMissing = raw === null;
        if (isMissing) {
            safeSet(key, seed);
            return seed;
        }

        const parsed: unknown = JSON.parse(raw);

        const isInvalid = validate !== undefined && !validate(parsed);
        if (isInvalid) {
            // eslint-disable-next-line no-console
            console.warn(`[storage] Invalid schema for key "${key}", resetting to seed`);
            safeSet(key, seed);
            return seed;
        }

        return parsed as T;
    } catch {
        safeSet(key, seed);
        return seed;
    }
}

/** Validates that a value is a non-null, non-array object. */
export function isObject(v: unknown): boolean {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validates that a value is an array (items unchecked). */
export function isArray(v: unknown): boolean {
    return Array.isArray(v);
}

export function isNumberInRange(min: number, max: number): (v: unknown) => boolean {
    return (v) => typeof v === 'number' && v >= min && v <= max;
}

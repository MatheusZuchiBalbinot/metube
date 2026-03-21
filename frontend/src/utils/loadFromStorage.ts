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
            localStorage.setItem(key, JSON.stringify(seed));
            return seed;
        }

        const parsed: unknown = JSON.parse(raw);

        const isInvalid = validate !== undefined && !validate(parsed);
        if (isInvalid) {
            console.warn(`[storage] Invalid schema for key "${key}", resetting to seed`);
            localStorage.setItem(key, JSON.stringify(seed));
            return seed;
        }

        return parsed as T;
    } catch {
        localStorage.setItem(key, JSON.stringify(seed));
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

/** Validates that a value is a number within [min, max]. */
export function isNumberInRange(min: number, max: number): (v: unknown) => boolean {
    return (v) => typeof v === 'number' && v >= min && v <= max;
}

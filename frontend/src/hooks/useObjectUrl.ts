import { useEffect, useRef, useState } from 'react';

export interface UseObjectUrlReturn {
    url: string | null
    set: (file: File) => string
    clear: () => void
}

/**
 * Manages the lifecycle of a single `URL.createObjectURL` value.
 *
 * Revokes the previous URL whenever a new one is set, on `clear`, and on
 * unmount — so callers never have to track the revoke manually.
 */
export function useObjectUrl(): UseObjectUrlReturn {
    const urlRef = useRef<string | null>(null);
    const [url, setUrl] = useState<string | null>(null);

    function revoke() {
        const hasUrl = urlRef.current !== null;

        if (hasUrl) {
            URL.revokeObjectURL(urlRef.current!);
            urlRef.current = null;
        }
    }

    function set(file: File): string {
        revoke();
        const next = URL.createObjectURL(file);
        urlRef.current = next;
        setUrl(next);
        return next;
    }

    function clear() {
        revoke();
        setUrl(null);
    }

    useEffect(() => () => {
        if (urlRef.current !== null) {
            URL.revokeObjectURL(urlRef.current);
        }
    }, []);

    return { url, set, clear };
}

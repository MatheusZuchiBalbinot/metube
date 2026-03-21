import { useState, useCallback } from 'react';

export function useBurstAnimation(duration = 400) {
    const [animating, setAnimating] = useState(false);

    const trigger = useCallback(() => {
        setAnimating(true);
        setTimeout(() => setAnimating(false), duration);
    }, [duration]);

    return [animating, trigger] as const;
}

import { useEffect } from 'react';

export function useShortsFeedObserver(
    feedRef: React.RefObject<HTMLDivElement | null>,
    itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
    onActivate: (index: number) => void,
    count: number,
) {
    useEffect(() => {
        const feed = feedRef.current;
        const hasNoItems = count === 0;

        if (!feed || hasNoItems) {
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    const isVisible = entry.intersectionRatio >= 0.6;

                    if (!isVisible) {
                        continue;
                    }

                    const idx = itemRefs.current.indexOf(entry.target as HTMLDivElement);
                    const isValidIndex = idx !== -1;

                    if (isValidIndex) {
                        onActivate(idx);
                    }
                }
            },
            { root: feed, threshold: 0.6 },
        );

        itemRefs.current.forEach(el => {
            const isMounted = el !== null;

            if (isMounted) {
                observer.observe(el);
            }
        });

        return () => observer.disconnect();
    }, [count, feedRef, itemRefs, onActivate]);
}

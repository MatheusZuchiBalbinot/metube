import { useEffect, type RefObject } from 'react';
import type { Vuid } from '@api';
import type { AnalyticsSource } from '@api';
import { reportImpression } from '@utils';

interface Options {
    threshold?: number
    enabled?: boolean
}

/**
 * Reports an impression for `vuid` once the referenced element becomes
 * visible (>= 50% by default). Each (vuid, source) pair is reported at
 * most once per session.
 */
export function useTrackImpression(
    ref: RefObject<HTMLElement | null>,
    vuid: Vuid,
    source: AnalyticsSource,
    options: Options = {},
): void {
    const { threshold = 0.5, enabled = true } = options;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const element = ref.current;
        const hasNoSupport = typeof IntersectionObserver === 'undefined';

        if (element === null || hasNoSupport) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                const isVisibleEnough = entry.isIntersecting && entry.intersectionRatio >= threshold;

                if (!isVisibleEnough) {
                    continue;
                }

                reportImpression(vuid, source);
                observer.disconnect();
                return;
            }
        }, { threshold });

        observer.observe(element);

        return () => observer.disconnect();
    }, [ref, vuid, source, threshold, enabled]);
}

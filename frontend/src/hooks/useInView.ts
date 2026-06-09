import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface UseInViewOptions {
    threshold?: number
    rootMargin?: string
    once?: boolean
}

export function useInView({ threshold = 0.1, rootMargin = '0px', once = true }: UseInViewOptions = {}) {
    const ref = useRef<HTMLElement>(null);
    const [inView, setInView] = useState(false);

    // Check synchronously before first paint so elements already in the viewport
    // don't flash invisible for one frame (IntersectionObserver fires asynchronously).
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) {
            return;
        }
        const rect = el.getBoundingClientRect();
        const isAlreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isAlreadyVisible) {
            setInView(true);
        }
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                const isVisible = entry.isIntersecting;
                if (isVisible) {
                    setInView(true);
                    const shouldUnobserve = once;
                    if (shouldUnobserve) {
                        observer.unobserve(el);
                    }
                } else if (!once) {
                    setInView(false);
                }
            },
            { threshold, rootMargin },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, rootMargin, once]);

    return { ref, inView };
}

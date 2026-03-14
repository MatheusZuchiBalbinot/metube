import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
    threshold?: number
    rootMargin?: string
    once?: boolean
}

export function useInView({ threshold = 0.1, rootMargin = '0px', once = true }: UseInViewOptions = {}) {
    const ref = useRef<HTMLElement>(null);
    const [inView, setInView] = useState(false);

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

const RIPPLE_DURATION_MS = 420;

export function triggerThemeRipple(originEl: Element, newMode: 'dark' | 'light'): Promise<void> {
    const isViewTransitionsSupported = typeof document.startViewTransition === 'function';
    if (isViewTransitionsSupported) {
        return Promise.resolve();
    }

    const rect = originEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const bg = newMode === 'dark' ? '#09090c' : '#f2f2f7';
    const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
    );

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: ${bg};
        clip-path: circle(0px at ${x}px ${y}px);
        z-index: 9998;
        pointer-events: none;
        transition: clip-path ${RIPPLE_DURATION_MS}ms ease-in-out;
        will-change: clip-path;
    `;

    document.body.appendChild(overlay);

    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.style.clipPath = `circle(${maxRadius}px at ${x}px ${y}px)`;

                setTimeout(() => {
                    resolve();
                }, RIPPLE_DURATION_MS / 2);

                setTimeout(() => {
                    overlay.remove();
                }, RIPPLE_DURATION_MS + 50);
            });
        });
    });
}

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerThemeRipple } from '@utils/themeRipple';

describe('triggerThemeRipple', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        Reflect.deleteProperty(document as unknown as { startViewTransition?: unknown }, 'startViewTransition');
    });

    function makeEl(): Element {
        const el = document.createElement('div');
        el.getBoundingClientRect = () => ({
            x: 0, y: 0, top: 50, left: 50, right: 100, bottom: 100,
            width: 50, height: 50, toJSON: () => ({}),
        });
        document.body.appendChild(el);
        return el;
    }

    it('resolves immediately when document.startViewTransition is supported', async () => {
        Object.defineProperty(document, 'startViewTransition', {
            value: vi.fn(),
            configurable: true,
            writable: true,
        });
        const el = makeEl();

        await expect(triggerThemeRipple(el, 'dark')).resolves.toBeUndefined();
    });

    it('appends and removes an overlay when fallback path is used (dark)', async () => {
        const el = makeEl();
        const divsBefore = document.body.querySelectorAll('div').length;
        const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            cb(0);
            return 1;
        });

        const promise = triggerThemeRipple(el, 'dark');

        expect(document.body.querySelectorAll('div').length).toBe(divsBefore + 1);

        await vi.advanceTimersByTimeAsync(1000);
        await promise;

        expect(document.body.querySelectorAll('div').length).toBe(divsBefore);
        rafSpy.mockRestore();
    });

    it('appends an overlay for light mode', () => {
        const el = makeEl();
        const divsBefore = document.body.querySelectorAll('div').length;
        const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            cb(0);
            return 1;
        });

        void triggerThemeRipple(el, 'light');

        expect(document.body.querySelectorAll('div').length).toBe(divsBefore + 1);
        rafSpy.mockRestore();
    });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ScrollTopButton from '@components/ui/scrollTop/scrollTop';

function setScrollY(y: number): void {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
    act(() => {
        window.dispatchEvent(new Event('scroll'));
    });
}

describe('ScrollTopButton', () => {
    beforeEach(() => {
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            cb(0);
            return 0;
        });
        vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    });

    afterEach(() => {
        setScrollY(0);
        vi.restoreAllMocks();
    });

    it('stays hidden near the top of the page', () => {
        render(<ScrollTopButton />);
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('appears after scrolling down and scrolls to top on click', () => {
        render(<ScrollTopButton />);

        setScrollY(800);
        const button = screen.getByRole('button');

        act(() => {
            button.click();
        });

        expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    });
});

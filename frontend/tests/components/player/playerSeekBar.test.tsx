// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerSeekBar from '@components/player/playerSeekBar';
import type { VideoChapter } from '@api';

class MockResizeObserver {
    observe() { /* noop */ }
    unobserve() { /* noop */ }
    disconnect() { /* noop */ }
}

function makeVideoRef(duration = 100) {
    const el = document.createElement('video');
    Object.defineProperty(el, 'duration', { value: duration, configurable: true });
    Object.defineProperty(el, 'currentTime', { value: 0, writable: true, configurable: true });
    return { current: el as unknown as HTMLVideoElement };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof PlayerSeekBar>> = {}): React.ComponentProps<typeof PlayerSeekBar> {
    return {
        videoRef: makeVideoRef(),
        src: 'https://example.com/video.mp4',
        duration: 100,
        bufferedPct: 40,
        currentTime: 25,
        forceShow: vi.fn(),
        scheduleHideControls: vi.fn(),
        onDraggingChange: vi.fn(),
        ...overrides,
    };
}

function stubRect(container: HTMLElement, width = 200) {
    const inner = container.querySelector('.vp__seek-inner') as HTMLElement;
    inner.getBoundingClientRect = () => ({
        left: 0, top: 0, right: width, bottom: 20, width, height: 20, x: 0, y: 0, toJSON: () => undefined,
    } as DOMRect);
    return inner;
}

describe('PlayerSeekBar', () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, 'ResizeObserver', {
            value: MockResizeObserver,
            configurable: true,
            writable: true,
        });
    });

    it('renders the slider with correct aria values', () => {
        render(<PlayerSeekBar {...baseProps({ currentTime: 25, duration: 100 })} />);

        const slider = screen.getByRole('slider', { name: 'Seek bar' });
        expect(slider).toHaveAttribute('aria-valuemin', '0');
        expect(slider).toHaveAttribute('aria-valuemax', '100');
        expect(slider).toHaveAttribute('aria-valuenow', '25');
    });

    it('scales the fill and buffered bars to the current progress', () => {
        const { container } = render(<PlayerSeekBar {...baseProps({ currentTime: 50, duration: 100, bufferedPct: 70 })} />);

        const fill = container.querySelector('.vp__seek-fill') as HTMLElement;
        const buffered = container.querySelector('.vp__seek-buffered') as HTMLElement;

        expect(fill.style.transform).toBe('scaleX(0.5)');
        expect(buffered.style.transform).toBe('scaleX(0.7)');
    });

    it('renders a chapter dot for each chapter within the visible range', () => {
        const chapters: VideoChapter[] = [
            { timestamp: '00:10', title: 'Intro' },
            { timestamp: '00:50', title: 'Middle' },
        ];
        const { container } = render(<PlayerSeekBar {...baseProps({ chapters, duration: 100 })} />);

        expect(container.querySelectorAll('.vp__chapter-dot')).toHaveLength(2);
    });

    it('seeking the video when a chapter dot is clicked', () => {
        const chapters: VideoChapter[] = [{ timestamp: '00:10', title: 'Intro' }];
        const videoRef = makeVideoRef(100);
        const { container } = render(<PlayerSeekBar {...baseProps({ chapters, duration: 100, videoRef })} />);

        const dot = container.querySelector('.vp__chapter-dot') as HTMLElement;
        fireEvent.click(dot);

        expect(videoRef.current.currentTime).toBe(10);
    });

    it('renders the A/B repeat markers when set', () => {
        const { container } = render(
            <PlayerSeekBar {...baseProps({ duration: 100, abRepeat: { a: 20, b: 60 } })} />,
        );

        expect(container.querySelector('.vp__seek-ab-marker--a')).toBeInTheDocument();
        expect(container.querySelector('.vp__seek-ab-marker--b')).toBeInTheDocument();
        expect(container.querySelector('.vp__seek-ab-region')).toBeInTheDocument();
    });

    it('does not render A/B markers when abRepeat.a is null', () => {
        const { container } = render(
            <PlayerSeekBar {...baseProps({ duration: 100, abRepeat: { a: null, b: null } })} />,
        );

        expect(container.querySelector('.vp__seek-ab-marker--a')).not.toBeInTheDocument();
    });

    it('seeks the video when the track is clicked at a given position', () => {
        const videoRef = makeVideoRef(100);
        const { container } = render(<PlayerSeekBar {...baseProps({ duration: 100, videoRef })} />);
        stubRect(container, 200);

        const slider = screen.getByRole('slider', { name: 'Seek bar' });
        fireEvent.click(slider, { clientX: 100 });

        expect(videoRef.current.currentTime).toBe(50);
    });
});

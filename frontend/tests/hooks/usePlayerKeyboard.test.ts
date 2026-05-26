// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerKeyboard } from '@hooks/usePlayerKeyboard';
import { SkipDirection } from '@enums/skipDirection';

function makeVideoRef(currentTime = 0, duration = 100) {
    const el = document.createElement('video');
    Object.defineProperty(el, 'currentTime', {
        get: () => currentTime,
        set: (v: number) => {
            currentTime = v;
        },
        configurable: true,
    });
    Object.defineProperty(el, 'duration', {
        get: () => duration,
        configurable: true,
    });
    Object.defineProperty(el, 'volume', {
        get: () => 0.5,
        set: () => {},
        configurable: true,
    });
    return { ref: { current: el }, el };
}

function defaultCallbacks() {
    return {
        onTogglePlay: vi.fn(),
        onSkip: vi.fn(),
        onVolumeChange: vi.fn(),
        onMuteToggle: vi.fn(),
        onFullscreenToggle: vi.fn(),
        onTheaterToggle: vi.fn(),
        onPipToggle: vi.fn(),
        onCaptionsToggle: vi.fn(),
    };
}

function pressKey(key: string, target: EventTarget = document) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('usePlayerKeyboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('space key triggers onTogglePlay', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: false, captureKeyboard: true, ...cbs }));
        pressKey(' ');
        expect(cbs.onTogglePlay).toHaveBeenCalledTimes(1);
    });

    it('ArrowRight key triggers onSkip(FWD)', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: false, captureKeyboard: true, ...cbs }));
        pressKey('ArrowRight');
        expect(cbs.onSkip).toHaveBeenCalledWith(SkipDirection.FWD);
    });

    it('ArrowLeft key triggers onSkip(BWD)', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: false, captureKeyboard: true, ...cbs }));
        pressKey('ArrowLeft');
        expect(cbs.onSkip).toHaveBeenCalledWith(SkipDirection.BWD);
    });

    it('"m" key triggers onMuteToggle', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: false, captureKeyboard: true, ...cbs }));
        pressKey('m');
        expect(cbs.onMuteToggle).toHaveBeenCalledTimes(1);
    });

    it('"M" (uppercase) also triggers onMuteToggle', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: false, captureKeyboard: true, ...cbs }));
        pressKey('M');
        expect(cbs.onMuteToggle).toHaveBeenCalledTimes(1);
    });

    it('"f" key triggers onFullscreenToggle only when isDefault=true', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));
        pressKey('f');
        expect(cbs.onFullscreenToggle).toHaveBeenCalledTimes(1);
    });

    it('"f" key does not trigger onFullscreenToggle when isDefault=false', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: false, captureKeyboard: true, ...cbs }));
        pressKey('f');
        expect(cbs.onFullscreenToggle).not.toHaveBeenCalled();
    });

    it('does not capture keys when captureKeyboard=false', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: false, ...cbs }));
        pressKey(' ');
        expect(cbs.onTogglePlay).not.toHaveBeenCalled();
    });

    it('does not capture keys when target is an input element', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: false, captureKeyboard: true, ...cbs }));

        const input = document.createElement('input');
        document.body.appendChild(input);
        pressKey(' ', input);
        document.body.removeChild(input);

        expect(cbs.onTogglePlay).not.toHaveBeenCalled();
    });

    it('does not capture keys when videoRef is null', () => {
        const cbs = defaultCallbacks();
        const nullRef = { current: null };
        renderHook(() => usePlayerKeyboard({ videoRef: nullRef, isDefault: false, captureKeyboard: true, ...cbs }));
        pressKey(' ');
        expect(cbs.onTogglePlay).not.toHaveBeenCalled();
    });

    it('removes keydown listener on unmount', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        const spy = vi.spyOn(document, 'removeEventListener');

        const { unmount } = renderHook(() =>
            usePlayerKeyboard({ videoRef: ref, isDefault: false, captureKeyboard: true, ...cbs }),
        );

        unmount();

        expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });

    it('ArrowRight skips forward and clamps to duration', () => {
        const { ref, el } = makeVideoRef(98, 100);
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));

        pressKey('ArrowRight');

        expect(cbs.onSkip).toHaveBeenCalledWith(SkipDirection.FWD);
        expect(el.currentTime).toBeLessThanOrEqual(100);
    });

    it('ArrowLeft skips backward and clamps to 0', () => {
        const { ref, el } = makeVideoRef(2, 100);
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));

        pressKey('ArrowLeft');

        expect(cbs.onSkip).toHaveBeenCalledWith(SkipDirection.BWD);
        expect(el.currentTime).toBeGreaterThanOrEqual(0);
    });

    it('ArrowUp increases volume by 0.1 (default player only)', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));

        pressKey('ArrowUp');

        expect(cbs.onVolumeChange).toHaveBeenCalledWith(expect.closeTo(0.6, 5));
    });

    it('ArrowDown decreases volume by 0.1 (default player only)', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));

        pressKey('ArrowDown');

        expect(cbs.onVolumeChange).toHaveBeenCalledWith(expect.closeTo(0.4, 5));
    });

    it('ArrowUp does nothing when isDefault=false', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: false, captureKeyboard: true, ...cbs }));

        pressKey('ArrowUp');

        expect(cbs.onVolumeChange).not.toHaveBeenCalled();
    });

    it('t triggers theater toggle (default player)', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));

        pressKey('t');

        expect(cbs.onTheaterToggle).toHaveBeenCalled();
    });

    it('i triggers PiP toggle (default player)', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));

        pressKey('i');

        expect(cbs.onPipToggle).toHaveBeenCalled();
    });

    it('c triggers captions toggle (default player)', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));

        pressKey('c');

        expect(cbs.onCaptionsToggle).toHaveBeenCalled();
    });

    it('skips keystrokes when target is a BUTTON element', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));

        const btn = document.createElement('button');
        document.body.appendChild(btn);
        const evt = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
        btn.dispatchEvent(evt);

        expect(cbs.onTogglePlay).not.toHaveBeenCalled();
        btn.remove();
    });

    it('ignores unrecognised keys', () => {
        const { ref } = makeVideoRef();
        const cbs = defaultCallbacks();
        renderHook(() => usePlayerKeyboard({ videoRef: ref, isDefault: true, captureKeyboard: true, ...cbs }));

        pressKey('z');

        expect(cbs.onTogglePlay).not.toHaveBeenCalled();
        expect(cbs.onSkip).not.toHaveBeenCalled();
        expect(cbs.onMuteToggle).not.toHaveBeenCalled();
    });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface MockAudioContext {
    state: 'running' | 'suspended';
    currentTime: number;
    destination: object;
    resume: () => Promise<void>;
    createOscillator: () => MockOscillator;
    createGain: () => MockGain;
}

interface MockOscillator {
    type: string;
    frequency: { setValueAtTime: (hz: number, t: number) => void };
    connect: (target: object) => void;
    start: (t: number) => void;
    stop: (t: number) => void;
}

interface MockGain {
    gain: {
        setValueAtTime: (v: number, t: number) => void;
        linearRampToValueAtTime: (v: number, t: number) => void;
        exponentialRampToValueAtTime: (v: number, t: number) => void;
    };
    connect: (target: object) => void;
}

function makeMockCtx(state: 'running' | 'suspended' = 'running'): MockAudioContext & {
    _oscillators: MockOscillator[];
    _gains: MockGain[];
    _resumeCalled: boolean;
} {
    const oscillators: MockOscillator[] = [];
    const gains: MockGain[] = [];
    let resumeCalled = false;

    return {
        state,
        currentTime: 0,
        destination: {},
        resume: vi.fn(async () => {
            resumeCalled = true;
        }),
        createOscillator: vi.fn(() => {
            const osc: MockOscillator = {
                type: '',
                frequency: { setValueAtTime: vi.fn() },
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
            };
            oscillators.push(osc);
            return osc;
        }),
        createGain: vi.fn(() => {
            const gain: MockGain = {
                gain: {
                    setValueAtTime: vi.fn(),
                    linearRampToValueAtTime: vi.fn(),
                    exponentialRampToValueAtTime: vi.fn(),
                },
                connect: vi.fn(),
            };
            gains.push(gain);
            return gain;
        }),
        get _oscillators() {
            return oscillators;
        },
        get _gains() {
            return gains;
        },
        get _resumeCalled() {
            return resumeCalled;
        },
    };
}

describe('playNotificationSound', () => {
    let mockCtx: ReturnType<typeof makeMockCtx>;

    beforeEach(() => {
        vi.resetModules();
        mockCtx = makeMockCtx();
        Object.defineProperty(window, 'AudioContext', {
            value: function MockCtor() {
                return mockCtx;
            },
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        Reflect.deleteProperty(window, 'AudioContext');
    });

    it('returns without playing when AudioContext is unavailable', async () => {
        Reflect.deleteProperty(window, 'AudioContext');
        Reflect.deleteProperty(window as unknown as { webkitAudioContext?: unknown }, 'webkitAudioContext');

        const { playNotificationSound } = await import('@utils/notificationSound');
        await expect(playNotificationSound()).resolves.toBeUndefined();
    });

    it('creates three oscillators and three gains when ctx is available', async () => {
        const { playNotificationSound } = await import('@utils/notificationSound');
        await playNotificationSound();

        expect(mockCtx._oscillators).toHaveLength(3);
        expect(mockCtx._gains).toHaveLength(3);
    });

    it('resumes the AudioContext when it is suspended', async () => {
        mockCtx.state = 'suspended';
        const { playNotificationSound } = await import('@utils/notificationSound');
        await playNotificationSound();

        expect(mockCtx._resumeCalled).toBe(true);
    });

    it('does not call resume when ctx is running', async () => {
        const { playNotificationSound } = await import('@utils/notificationSound');
        await playNotificationSound();

        expect(mockCtx._resumeCalled).toBe(false);
    });

    it('falls back to webkitAudioContext when AudioContext is missing', async () => {
        Reflect.deleteProperty(window, 'AudioContext');
        let called = false;
        Object.defineProperty(window, 'webkitAudioContext', {
            value: function MockWebkitCtor() {
                called = true;
                return mockCtx;
            },
            configurable: true,
            writable: true,
        });

        const { playNotificationSound } = await import('@utils/notificationSound');
        await playNotificationSound();

        expect(called).toBe(true);
        Reflect.deleteProperty(window as unknown as { webkitAudioContext?: unknown }, 'webkitAudioContext');
    });
});

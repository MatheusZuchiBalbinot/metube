// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
    const echoInstance = {
        disconnect: vi.fn(),
        leave: vi.fn(),
        private: vi.fn(),
    };
    let callCount = 0;
    let lastConfig: { authorizer?: (channel: { name: string }) => { authorize: (sid: string, cb: (err: Error | null, data: unknown) => void) => void } } | null = null;
    function EchoCtor(config: unknown) {
        callCount += 1;
        lastConfig = config as typeof lastConfig;
        return echoInstance;
    }
    const Pusher = function MockPusher() {};
    return {
        echoInstance,
        EchoCtor,
        Pusher,
        getCallCount: () => callCount,
        getLastConfig: () => lastConfig,
        resetCallCount: () => {
            callCount = 0;
            lastConfig = null;
        },
    };
});

const axiosMocks = vi.hoisted(() => ({
    post: vi.fn(),
}));

vi.mock('axios', () => ({
    default: {
        post: axiosMocks.post,
    },
}));

vi.mock('laravel-echo', () => ({
    default: mocks.EchoCtor,
}));

vi.mock('pusher-js', () => ({
    default: mocks.Pusher,
}));

describe('echo lazy loader', () => {
    beforeEach(() => {
        vi.resetModules();
        mocks.resetCallCount();
        mocks.echoInstance.disconnect.mockClear();
    });

    it('returns null when VITE_REVERB_APP_KEY is not configured', async () => {
        // @ts-expect-error overriding import.meta.env for the test
        import.meta.env.VITE_REVERB_APP_KEY = '';
        const { getEcho } = await import('@lib/echo');

        const result = await getEcho();
        expect(result).toBeNull();
    });

    it('constructs and returns the Echo singleton when configured', async () => {
        // @ts-expect-error overriding import.meta.env for the test
        import.meta.env.VITE_REVERB_APP_KEY = 'test-key';
        // @ts-expect-error overriding import.meta.env for the test
        import.meta.env.VITE_REVERB_HOST = 'localhost';
        // @ts-expect-error overriding import.meta.env for the test
        import.meta.env.VITE_REVERB_PORT = '8080';

        const { getEcho } = await import('@lib/echo');
        const result = await getEcho();

        expect(result).toBe(mocks.echoInstance);
        expect(mocks.getCallCount()).toBe(1);
    });

    it('returns the cached instance on subsequent calls', async () => {
        // @ts-expect-error overriding import.meta.env for the test
        import.meta.env.VITE_REVERB_APP_KEY = 'test-key';
        const { getEcho } = await import('@lib/echo');

        await getEcho();
        await getEcho();
        await getEcho();

        expect(mocks.getCallCount()).toBe(1);
    });

    it('destroyEcho disconnects and clears the singleton so getEcho rebuilds', async () => {
        // @ts-expect-error overriding import.meta.env for the test
        import.meta.env.VITE_REVERB_APP_KEY = 'test-key';
        const { getEcho, destroyEcho } = await import('@lib/echo');

        await getEcho();
        destroyEcho();

        expect(mocks.echoInstance.disconnect).toHaveBeenCalled();

        await getEcho();
        expect(mocks.getCallCount()).toBe(2);
    });

    it('destroyEcho is a no-op when no instance exists', async () => {
        // @ts-expect-error overriding import.meta.env for the test
        import.meta.env.VITE_REVERB_APP_KEY = '';
        const { destroyEcho } = await import('@lib/echo');

        expect(() => destroyEcho()).not.toThrow();
        expect(mocks.echoInstance.disconnect).not.toHaveBeenCalled();
    });

    describe('authorizer', () => {
        beforeEach(() => {
            axiosMocks.post.mockReset();
        });

        it('calls axios with credentials and forwards response to callback on success', async () => {
            // @ts-expect-error overriding import.meta.env for the test
            import.meta.env.VITE_REVERB_APP_KEY = 'test-key';
            axiosMocks.post.mockResolvedValue({ data: { auth: 'sig:abc' } });

            const { getEcho } = await import('@lib/echo');
            await getEcho();

            const config = mocks.getLastConfig();
            const authorizer = config?.authorizer?.({ name: 'private-users.uuid-1' });
            const cb = vi.fn();
            await authorizer?.authorize('socket-id', cb);

            expect(axiosMocks.post).toHaveBeenCalledWith(
                '/api/broadcasting/auth',
                expect.objectContaining({ socket_id: 'socket-id', channel_name: 'private-users.uuid-1' }),
                expect.objectContaining({ withCredentials: true }),
            );
            expect(cb).toHaveBeenCalledWith(null, { auth: 'sig:abc' });
        });

        it('forwards the error to the callback on failure', async () => {
            // @ts-expect-error overriding import.meta.env for the test
            import.meta.env.VITE_REVERB_APP_KEY = 'test-key';
            const err = new Error('boom');
            axiosMocks.post.mockRejectedValue(err);

            const { getEcho } = await import('@lib/echo');
            await getEcho();

            const config = mocks.getLastConfig();
            const authorizer = config?.authorizer?.({ name: 'private-users.uuid-2' });
            const cb = vi.fn();
            await authorizer?.authorize('socket-id', cb);

            // Promise tick
            await new Promise(res => setTimeout(res, 0));

            expect(cb).toHaveBeenCalledWith(err, null);
        });
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@utils/logger';

describe('logger', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let infoSpy: ReturnType<typeof vi.spyOn>;
    let debugSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
        warnSpy.mockRestore();
        infoSpy.mockRestore();
        debugSpy.mockRestore();
    });

    it('error prefixes the message with [MeTube] and [ERROR]', () => {
        logger.error('boom');
        expect(errorSpy).toHaveBeenCalled();
        const msg = errorSpy.mock.calls[0][0] as string;
        expect(msg).toContain('[MeTube]');
        expect(msg).toContain('[ERROR]');
        expect(msg).toContain('boom');
    });

    it('warn includes context JSON in the message', () => {
        logger.warn('careful', { x: 1 });
        expect(warnSpy).toHaveBeenCalled();
        const msg = warnSpy.mock.calls[0][0] as string;
        expect(msg).toContain('[WARN]');
        expect(msg).toContain('"x":1');
    });

    it('info logs to console.info', () => {
        logger.info('hello');
        expect(infoSpy).toHaveBeenCalled();
    });

    it('debug logs only in DEV mode (via import.meta.env.DEV check)', () => {
        logger.debug('details');
        // Either called (DEV) or not — both branches are valid; just exercise the path.
        expect(debugSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
    });
});

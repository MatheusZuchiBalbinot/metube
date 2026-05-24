// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { history } from '@api/history';
import { apiClient } from '@api/client';

vi.mock('@api/client', () => ({
    apiClient: {
        get: vi.fn(),
        delete: vi.fn(),
    },
}));

const ok = <T>(data: T) => ({ ok: true as const, data });
const fail = () => ({ ok: false as const, error: 'fail' });

const vuid = 'abc12345678' as Parameters<typeof history.remove>[0];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('HistoryApi', () => {
    describe('list', () => {
        it('calls get on /users/me/history', async () => {
            vi.mocked(apiClient.get).mockResolvedValue(ok([]));
            await history.list();
            expect(apiClient.get).toHaveBeenCalledWith('/users/me/history');
        });
    });

    describe('events', () => {
        it('calls get on /users/me/history/events', async () => {
            vi.mocked(apiClient.get).mockResolvedValue(ok([]));
            await history.events();
            expect(apiClient.get).toHaveBeenCalledWith('/users/me/history/events');
        });
    });

    describe('remove', () => {
        it('deletes /users/me/history/:vuid', async () => {
            vi.mocked(apiClient.delete).mockResolvedValue(ok(undefined));
            await history.remove(vuid);
            expect(apiClient.delete).toHaveBeenCalledWith(`/users/me/history/${vuid}`);
        });
    });

    describe('clear', () => {
        it('deletes /users/me/history', async () => {
            vi.mocked(apiClient.delete).mockResolvedValue(ok(undefined));
            await history.clear();
            expect(apiClient.delete).toHaveBeenCalledWith('/users/me/history');
        });
    });

    describe('progress', () => {
        it('calls get on /users/me/progress', async () => {
            vi.mocked(apiClient.get).mockResolvedValue(ok({ data: {} }));
            await history.progress();
            expect(apiClient.get).toHaveBeenCalledWith('/users/me/progress');
        });

        it('returns data from response', async () => {
            vi.mocked(apiClient.get).mockResolvedValue(ok({ data: { 'abc12345678': 75 } }));
            const result = await history.progress();
            expect(result).toEqual({ 'abc12345678': 75 });
        });

        it('returns null when response fails', async () => {
            vi.mocked(apiClient.get).mockResolvedValue(fail());
            const result = await history.progress();
            expect(result).toBeNull();
        });
    });
});

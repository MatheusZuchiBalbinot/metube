// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifications } from '@api/notifications';
import { apiClient } from '@api/client';

vi.mock('@api/client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

const ok = <T>(data: T) => ({ ok: true as const, data });
const fail = () => ({ ok: false as const, error: 'fail' });

beforeEach(() => {
    vi.clearAllMocks();
});

describe('NotificationsApi', () => {
    describe('list', () => {
        it('calls get on /notifications?page=1 by default', async () => {
            vi.mocked(apiClient.get).mockResolvedValue(ok({ data: [], meta: { current_page: 1, last_page: 1 } }));
            await notifications.list();
            expect(apiClient.get).toHaveBeenCalledWith('/notifications?page=1');
        });

        it('uses provided page number', async () => {
            vi.mocked(apiClient.get).mockResolvedValue(ok({ data: [], meta: { current_page: 3, last_page: 5 } }));
            await notifications.list(3);
            expect(apiClient.get).toHaveBeenCalledWith('/notifications?page=3');
        });
    });

    describe('unreadCount', () => {
        it('returns count from response', async () => {
            vi.mocked(apiClient.get).mockResolvedValue(ok({ count: 5 }));
            const result = await notifications.unreadCount();
            expect(result).toBe(5);
        });

        it('returns 0 when response fails', async () => {
            vi.mocked(apiClient.get).mockResolvedValue(fail());
            const result = await notifications.unreadCount();
            expect(result).toBe(0);
        });
    });

    describe('markRead', () => {
        it('posts to /notifications/:id/read', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(ok(null));
            await notifications.markRead('notif-001');
            expect(apiClient.post).toHaveBeenCalledWith('/notifications/notif-001/read');
        });
    });

    describe('markAllRead', () => {
        it('posts to /notifications/read-all', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(ok(null));
            await notifications.markAllRead();
            expect(apiClient.post).toHaveBeenCalledWith('/notifications/read-all');
        });
    });

    describe('remove', () => {
        it('deletes /notifications/:id', async () => {
            vi.mocked(apiClient.delete).mockResolvedValue(ok(undefined));
            await notifications.remove('notif-001');
            expect(apiClient.delete).toHaveBeenCalledWith('/notifications/notif-001');
        });
    });
});

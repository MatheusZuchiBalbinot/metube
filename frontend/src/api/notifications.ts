import { apiClient } from './client';
import type { NotificationType } from '@enums/notificationType';

export type { NotificationType };

export interface Notification {
    id: string
    type: NotificationType
    data: Record<string, unknown>
    read_at: string | null
    created_at: string
}

interface PaginatedNotifications {
    data: Notification[]
    meta: { current_page: number; last_page: number }
}

class NotificationsApi {
    private readonly baseUrl = '/notifications';

    async list(page = 1): Promise<PaginatedNotifications | null> {
        return apiClient.get<PaginatedNotifications>(`${this.baseUrl}?page=${page}`);
    }

    async unreadCount(): Promise<number> {
        const result = await apiClient.get<{ count: number }>(`${this.baseUrl}/unread-count`);
        return result?.count ?? 0;
    }

    async markRead(id: string): Promise<Notification | null> {
        return apiClient.post<Notification>(`${this.baseUrl}/${id}/read`);
    }

    async markAllRead(): Promise<void> {
        await apiClient.post(`${this.baseUrl}/read-all`);
    }

    async remove(id: string): Promise<void> {
        await apiClient.delete(`${this.baseUrl}/${id}`);
    }
}

export const notifications = new NotificationsApi();

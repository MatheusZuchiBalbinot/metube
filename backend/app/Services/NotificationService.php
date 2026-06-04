<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * NotificationService — Manages in-app notifications for users.
 *
 * Responsible for:
 * - Listing and counting notifications
 * - Marking individual or all notifications as read
 * - Deleting notifications
 */
final class NotificationService
{
    /**
     * Get paginated notifications for a user.
     *
     * @param User $user Authenticated user
     *
     * @return LengthAwarePaginator<DatabaseNotification>
     */
    public function list(User $user): LengthAwarePaginator
    {
        return $user->notifications()->paginate(PaginationSize::NOTIFICATION_LIST);
    }

    /**
     * Count unread notifications for a user.
     *
     * @param User $user Authenticated user
     *
     * @return int Number of unread notifications
     */
    public function unreadCount(User $user): int
    {
        return $user->unreadNotifications()->count();
    }

    /**
     * Mark a single notification as read.
     *
     * @param User $user Authenticated user (scopes the lookup for ownership)
     * @param string $id Notification UUID
     *
     * @return DatabaseNotification The updated notification
     */
    public function markRead(User $user, string $id): DatabaseNotification
    {
        /** @var DatabaseNotification $notification */
        $notification = $user->notifications()->findOrFail($id);
        $notification->markAsRead();

        return $notification;
    }

    /**
     * Mark all unread notifications as read for a user.
     *
     * @param User $user Authenticated user
     */
    public function markAllRead(User $user): void
    {
        $user->unreadNotifications()->update(['read_at' => now()]);
    }

    /**
     * Delete a notification.
     *
     * @param User $user Authenticated user (scopes the lookup for ownership)
     * @param string $id Notification UUID
     */
    public function delete(User $user, string $id): void
    {
        $user->notifications()->findOrFail($id)->delete();
    }
}

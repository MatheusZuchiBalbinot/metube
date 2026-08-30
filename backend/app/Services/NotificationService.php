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
     * @return LengthAwarePaginator<DatabaseNotification>
     */
    public function list(User $user): LengthAwarePaginator
    {
        return $user->notifications()->paginate(PaginationSize::NOTIFICATION_LIST);
    }

    public function unreadCount(User $user): int
    {
        return $user->unreadNotifications()->count();
    }

    public function markRead(User $user, string $id): DatabaseNotification
    {
        /** @var DatabaseNotification $notification */
        $notification = $user->notifications()->findOrFail($id);
        $notification->markAsRead();

        return $notification;
    }

    public function markAllRead(User $user): void
    {
        $user->unreadNotifications()->update(['read_at' => now()]);
    }

    public function delete(User $user, string $id): void
    {
        $user->notifications()->findOrFail($id)->delete();
    }
}

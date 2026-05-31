<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Config\PaginationSize;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class NotificationsController extends Controller
{
    /**
     * List paginated notifications for the authenticated user.
     *
     * @param Request $request Incoming HTTP request
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->paginate(PaginationSize::COMMENT_LIST);

        return $this->json(NotificationResource::collection($notifications));
    }

    /**
     * Return the count of unread notifications for the authenticated user.
     *
     * @param Request $request Incoming HTTP request
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = $request->user()->unreadNotifications()->count();

        return $this->json(['count' => $count]);
    }

    /**
     * Mark a single notification as read.
     *
     * @param Request $request Incoming HTTP request
     * @param string $notificationId Notification UUID
     */
    public function markRead(Request $request, string $notificationId): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($notificationId);

        $notification->markAsRead();

        return $this->json(new NotificationResource($notification));
    }

    /**
     * Mark all notifications as read for the authenticated user.
     *
     * @param Request $request Incoming HTTP request
     */
    public function readAll(Request $request): Response
    {
        $updateData = ['read_at' => now()];
        $request->user()->unreadNotifications()->update($updateData);

        return response()->noContent();
    }

    /**
     * Delete a single notification.
     *
     * @param Request $request Incoming HTTP request
     * @param string $notificationId Notification UUID
     */
    public function destroy(Request $request, string $notificationId): Response
    {
        $request->user()
            ->notifications()
            ->findOrFail($notificationId)
            ->delete();

        return response()->noContent();
    }
}

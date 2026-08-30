<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class NotificationsController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->json(NotificationResource::collection($this->notifications->list($user)));
    }

    public function unreadCount(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->json(['count' => $this->notifications->unreadCount($user)]);
    }

    public function markRead(Request $request, string $notificationId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $notification = $this->notifications->markRead($user, $notificationId);

        return $this->json(new NotificationResource($notification));
    }

    public function readAll(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $this->notifications->markAllRead($user);

        return $this->noContent();
    }

    public function destroy(Request $request, string $notificationId): Response
    {
        /** @var User $user */
        $user = $request->user();
        $this->notifications->delete($user, $notificationId);

        return $this->noContent();
    }
}

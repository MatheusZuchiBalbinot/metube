<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\HistoryPeriod;
use App\Http\Requests\User\HistoryRequest;
use App\Http\Resources\UserResource;
use App\Http\Resources\VideoResource;
use App\Http\Resources\WatchHistoryResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class UserController extends Controller
{
    public function __construct(private readonly UserService $userService) {}

    public function likes(): JsonResponse
    {
        $videos = $this->userService->getUserLikes(auth()->user());

        return $this->json(VideoResource::collection($videos));
    }

    public function saved(): JsonResponse
    {
        $videos = $this->userService->getUserSaved(auth()->user());

        return $this->json(VideoResource::collection($videos));
    }

    public function subscriptions(): JsonResponse
    {
        $channels = $this->userService->getUserSubscriptions(auth()->user());

        return $this->json(UserResource::collection($channels));
    }

    public function history(HistoryRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $periodValue = $validated['period'] ?? 'all';
        $period = HistoryPeriod::from($periodValue);
        $history = $this->userService->getUserHistory(auth()->user(), $period);

        return $this->json(WatchHistoryResource::collection($history));
    }

    public function clearHistory(): Response
    {
        $this->userService->clearUserHistory(auth()->user());

        return $this->noContent();
    }

    public function removeHistory(string $vuid): Response
    {
        $this->userService->removeFromHistory(auth()->user(), $vuid);

        return $this->noContent();
    }

    /**
     * Useful for activity heatmaps. Returns up to 365 days, newest first.
     */
    public function historyEvents(): JsonResponse
    {
        return $this->json($this->userService->getHistoryEvents(auth()->user()));
    }

    public function progress(): JsonResponse
    {
        $progress = $this->userService->getUserProgress(auth()->user());

        $payload = ['data' => $progress];

        return $this->json($payload);
    }
}

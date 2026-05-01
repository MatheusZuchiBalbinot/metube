<?php

namespace App\Http\Controllers;

use App\Enums\HistoryPeriod;
use App\Http\Resources\VideoResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * UserController — Routes authenticated user HTTP requests to services.
 *
 * Responsibility: Parse input, authorize, call service, format response.
 */
class UserController extends Controller
{
    public function __construct(private readonly UserService $userService) {}

    /**
     * Get all videos liked by the authenticated user.
     *
     * @return JsonResponse array{data: Video[], meta: {total: int, page: int}}
     */
    public function likes(): JsonResponse
    {
        $videos = $this->userService->getUserLikes(auth()->user());

        return $this->json(VideoResource::collection($videos));
    }

    /**
     * Get all videos saved by the authenticated user.
     *
     * @return JsonResponse array{data: Video[], meta: {total: int, page: int}}
     */
    public function saved(): JsonResponse
    {
        $videos = $this->userService->getUserSaved(auth()->user());

        return $this->json(VideoResource::collection($videos));
    }

    /**
     * Get all channels subscribed to by the authenticated user.
     *
     * @return JsonResponse array{data: User[], meta: {total: int}}
     */
    public function subscriptions(): JsonResponse
    {
        $channels = $this->userService->getUserSubscriptions(auth()->user());

        return $this->json($channels);
    }

    /**
     * Get the watch history of the authenticated user.
     *
     * Supports filtering by period: today, week, month, all
     *
     * @param  Request  $request  Query: period?{today|week|month|all}, page?, perPage?
     * @return JsonResponse array{data: HistoryEvent[], meta: {total: int, page: int}}
     */
    public function history(Request $request): JsonResponse
    {
        $periodValue = $request->query('period', 'all');
        $periodValue = is_string($periodValue) ? $periodValue : 'all';
        $period = HistoryPeriod::tryFrom($periodValue) ?? HistoryPeriod::ALL;
        $events = $this->userService->getUserHistory(auth()->user(), $period->value);

        return $this->json($events);
    }

    /**
     * Clear all watch history for the authenticated user.
     *
     * @return Response HTTP 204 No Content
     */
    public function clearHistory(): Response
    {
        $this->userService->clearUserHistory(auth()->user());

        return $this->noContent();
    }

    /**
     * Remove a specific video from the user's watch history.
     *
     * @param  string  $vuid  Video UUID (v4)
     * @return Response HTTP 204 No Content
     */
    public function removeHistory(string $vuid): Response
    {
        $this->userService->removeFromHistory(auth()->user(), $vuid);

        return $this->noContent();
    }

    /**
     * Get watch history events grouped by date.
     *
     * Groups views by day with video count. Useful for displaying
     * activity heatmap on user profile.
     *
     * @return array<string, array{date: string, count: int, videos: list}>
     */
    public function historyEvents(): array
    {
        return $this->userService->getHistoryEvents(auth()->user());
    }

    /**
     * Get watch progress for all videos the user has started.
     *
     * @return JsonResponse array{data: array<string, int>} Map of vuid => percent
     */
    public function progress(): JsonResponse
    {
        $progress = $this->userService->getUserProgress(auth()->user());

        return $this->json(['data' => $progress]);
    }
}

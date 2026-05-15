<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Http\Resources\VideoResource;
use App\Services\ChannelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * ChannelController — Routes channel HTTP requests to services.
 *
 * Responsibility: Parse input, authorize, call service, format response.
 */
class ChannelController extends Controller
{
    public function __construct(private readonly ChannelService $channelService) {}

    /**
     * Get channel profile information.
     *
     * @param  string  $uuid  User UUID (v4)
     * @return JsonResponse User profile data
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function show(string $uuid): JsonResponse
    {
        $user = $this->channelService->getByUuid($uuid);

        return $this->json(new UserResource($user));
    }

    /**
     * List videos for a channel.
     *
     * If the authenticated user owns the channel, every video is returned
     * (including processing, failed, scheduled, draft) so they can manage them
     * from their own profile. Otherwise only published videos are exposed.
     *
     * @param  string  $uuid  User UUID (v4)
     * @return JsonResponse array{data: Video[], meta: {total: int}}
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function videos(string $uuid): JsonResponse
    {
        $channel = $this->channelService->getByUuid($uuid);
        $isOwner = auth()->id() === $channel->id;
        $videos = $this->channelService->listVideos($channel, $isOwner);

        return $this->json(VideoResource::collection($videos));
    }

    /**
     * Toggle subscription to a channel.
     *
     * @param  string  $uuid  Channel user UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function toggleSubscription(string $uuid): Response
    {
        $this->channelService->toggleSubscription(auth()->user(), $uuid);

        return $this->noContent();
    }
}

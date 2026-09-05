<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Http\Resources\VideoResource;
use App\Services\ChannelService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ChannelController extends Controller
{
    public function __construct(private readonly ChannelService $channelService) {}

    /**
     * @throws ModelNotFoundException
     */
    public function show(string $uuid): JsonResponse
    {
        $user = $this->channelService->getByUuid($uuid);

        return $this->json(new UserResource($user));
    }

    /**
     * If the authenticated user owns the channel, every video is returned
     * (including processing, failed, scheduled, draft) so they can manage them
     * from their own profile. Otherwise only published videos are exposed.
     *
     * @throws ModelNotFoundException
     */
    public function videos(Request $request, string $uuid): JsonResponse
    {
        $channel = $this->channelService->getByUuid($uuid);
        $isOwner = auth()->id() === $channel->id;
        $page = (int) $request->query('page', '1');
        $videos = $this->channelService->listVideos($channel, includeAllStatuses: $isOwner, page: $page);

        return $this->json(VideoResource::collection($videos));
    }

    /**
     * @throws ModelNotFoundException
     */
    public function toggleSubscription(string $uuid): Response
    {
        $this->channelService->toggleSubscription(auth()->user(), $uuid);

        return $this->noContent();
    }
}

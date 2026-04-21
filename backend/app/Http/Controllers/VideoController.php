<?php

namespace App\Http\Controllers;

use App\Http\Requests\Video\StoreVideoRequest;
use App\Http\Requests\Video\UpdateProgressRequest;
use App\Http\Requests\Video\UpdateVideoRequest;
use App\Models\Video;
use App\Services\VideoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * VideoController — Routes video HTTP requests to services.
 *
 * Responsibility: Parse input, authorize, call service, format response.
 */
class VideoController extends Controller
{
    public function __construct(private readonly VideoService $videoService) {}

    /**
     * List all videos with pagination and filters.
     *
     * @param  Request  $request  Query: page?, perPage?, search?, tags[]?, status?
     * @return JsonResponse array{data: Video[], meta: {total: int, page: int}}
     */
    public function index(Request $request): JsonResponse
    {
        $videos = $this->videoService->listVideos($request->all());

        return $this->json($videos);
    }

    /**
     * Create a new video.
     *
     * @param  StoreVideoRequest  $request  Validated video data
     * @return JsonResponse Created video with $vuid
     *
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function store(StoreVideoRequest $request): JsonResponse
    {
        $video = $this->videoService->createVideo(auth()->user(), $request->validated());

        return $this->json($video, 201);
    }

    /**
     * Get a specific video by UUID.
     *
     * @param  string  $vuid  Video UUID (v4)
     * @return JsonResponse Video with full metadata
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function show(string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        return $this->json($video);
    }

    /**
     * Update a video's metadata.
     *
     * @param  UpdateVideoRequest  $request  Partial payload
     * @param  string  $vuid  Video UUID (v4)
     * @return JsonResponse Updated video
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function update(UpdateVideoRequest $request, string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $updated = $this->videoService->updateVideo($video, $request->validated());

        return $this->json($updated);
    }

    /**
     * Delete a video permanently.
     *
     * @param  string  $vuid  Video UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function destroy(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->videoService->deleteVideo($video);

        return $this->noContent();
    }

    /**
     * Record that a user viewed a video.
     *
     * @param  string  $vuid  Video UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function recordView(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->videoService->recordView(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Toggle like status for a video.
     *
     * @param  string  $vuid  Video UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function toggleLike(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->videoService->toggleLike(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Toggle dislike status for a video.
     *
     * @param  string  $vuid  Video UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function toggleDislike(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->videoService->toggleDislike(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Toggle save status for a video.
     *
     * @param  string  $vuid  Video UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function toggleSave(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->videoService->toggleSave(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Update user's watch progress for a video.
     *
     * @param  UpdateProgressRequest  $request  Validated: percent (0-100)
     * @param  string  $vuid  Video UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function updateProgress(UpdateProgressRequest $request, string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->videoService->updateProgress(auth()->user(), $video, $request->validated()['percent']);

        return $this->noContent();
    }

    /**
     * Get AI-generated summary for a video.
     *
     * @param  string  $vuid  Video UUID (v4)
     * @return JsonResponse {keyPoints: string[], chapters: {timestamp, title}[], readingMode: string}
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function summary(string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $summary = $this->videoService->getSummary($video);

        return $this->json($summary);
    }
}

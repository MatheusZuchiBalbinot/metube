<?php

namespace App\Http\Controllers;

use App\Data\CreateVideoData;
use App\Data\FinalizeUploadData;
use App\Data\UpdateVideoData;
use App\Enums\TranscriptionStatus;
use App\Http\Requests\Video\StoreVideoRequest;
use App\Http\Requests\Video\UpdateProgressRequest;
use App\Http\Requests\Video\UpdateVideoRequest;
use App\Http\Resources\TranscriptionResource;
use App\Http\Resources\VideoResource;
use App\Jobs\TranscribeVideo;
use App\Models\Transcription;
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

        return $this->json(VideoResource::collection($videos));
    }

    /**
     * Create a new video from a direct file upload or a completed tus session.
     *
     * Two upload modes are accepted:
     *   - Direct: multipart/form-data with `video_file` (+ optional `thumbnail_file`)
     *   - Resumable: JSON with `upload_key` from a completed tus session (+ optional `thumbnail_key`)
     *
     * @param  StoreVideoRequest  $request  Validated video data
     * @return JsonResponse Created video (202 Accepted — still processing)
     */
    public function store(StoreVideoRequest $request): JsonResponse
    {
        $isTusUpload = $request->has('upload_key');

        if ($isTusUpload) {
            $video = $this->videoService->finalizeUpload(
                auth()->user(),
                FinalizeUploadData::fromRequest($request->validated()),
            );
        } else {
            $video = $this->videoService->createVideo(
                auth()->user(),
                CreateVideoData::fromRequest($request->validated()),
            );
        }

        return $this->json(new VideoResource($video), 202);
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
        $this->authorize('view', $video);

        return $this->json(new VideoResource($video->load('channel')));
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
        $this->authorize('update', $video);

        $updated = $this->videoService->updateVideo($video, UpdateVideoData::fromRequest($request->validated()));

        return $this->json(new VideoResource($updated->load('channel')));
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
        $this->authorize('delete', $video);

        $this->videoService->deleteVideo($video);

        return $this->noContent();
    }

    /**
     * Record that a user viewed a video.
     *
     * @param  Request  $request  Optional body: source, session_id
     * @param  string  $vuid  Video UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function recordView(Request $request, string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $source = $request->input('source');
        $sessionId = $request->input('session_id');

        $this->videoService->recordView(
            auth()->user(),
            $video,
            is_string($source) ? $source : null,
            is_string($sessionId) ? $sessionId : null,
        );

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

    /**
     * Get the speech-to-text transcription for a video.
     *
     * Returns the transcription record if it exists, or a 404 when no
     * transcription has been started yet (e.g. video still processing).
     *
     * @param  string  $vuid  Video public identifier
     * @return JsonResponse {status: string, language: string|null, content: string|null}
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function transcription(string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $transcription = $video->transcription()->with('video')->first();

        $hasNoTranscription = $transcription === null;
        if ($hasNoTranscription) {
            return $this->json(['message' => 'Transcription not available.'], 404);
        }

        return $this->json(new TranscriptionResource($transcription));
    }

    /**
     * Retry a failed transcription for a video the authenticated user owns.
     *
     * @param  string  $vuid  Video public identifier
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function retryTranscription(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('retryTranscription', $video);

        Transcription::updateOrCreate(
            ['video_id' => $video->id],
            ['status' => TranscriptionStatus::PENDING, 'content' => null, 'language' => null],
        );

        dispatch(new TranscribeVideo($video));

        return $this->noContent();
    }
}

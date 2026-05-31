<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\DTOs\UpdateVideoDTO;
use App\DTOs\VideoListFilterDTO;
use App\Enums\TranscriptionStatus;
use App\Http\Requests\Video\RecordViewRequest;
use App\Http\Requests\Video\StoreVideoRequest;
use App\Http\Requests\Video\UpdateProgressRequest;
use App\Http\Requests\Video\UpdateVideoRequest;
use App\Http\Resources\TranscriptionResource;
use App\Http\Resources\VideoAiSuggestionResource;
use App\Http\Resources\VideoResource;
use App\Http\Resources\VideoSummaryResource;
use App\Jobs\TranscribeVideo;
use App\Models\Transcription;
use App\Models\Video;
use App\Services\RecommendationService;
use App\Services\VideoAiService;
use App\Services\VideoProgressService;
use App\Services\VideoPublishingService;
use App\Services\VideoReactionService;
use App\Services\VideoService;
use App\Services\VideoUploadService;
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
    public function __construct(
        private readonly VideoService $videoService,
        private readonly VideoUploadService $uploadService,
        private readonly VideoPublishingService $publishingService,
        private readonly VideoReactionService $reactionService,
        private readonly VideoProgressService $progressService,
        private readonly VideoAiService $aiService,
        private readonly RecommendationService $recommendationService,
    ) {}

    /**
     * List all videos with pagination and filters.
     *
     * @param Request $request Query: page?, perPage?, search?, tags[]?, status?
     *
     * @return JsonResponse array{data: Video[], meta: {total: int, page: int}}
     */
    public function index(Request $request): JsonResponse
    {
        $filters = VideoListFilterDTO::fromArray($request->all());
        $videos = $this->videoService->listVideos($filters);

        return $this->json(VideoResource::collection($videos));
    }

    /**
     * Create a new video from a direct file upload or a completed tus session.
     *
     * Two upload modes are accepted:
     *   - Direct: multipart/form-data with `video_file` (+ optional `thumbnail_file`)
     *   - Resumable: JSON with `upload_key` from a completed tus session (+ optional `thumbnail_key`)
     *
     * @param StoreVideoRequest $request Validated video data
     *
     * @return JsonResponse Created video (202 Accepted — still processing)
     */
    public function store(StoreVideoRequest $request): JsonResponse
    {
        $isTusUpload = $request->has('upload_key');

        if ($isTusUpload) {
            $video = $this->uploadService->finalizeUpload(
                auth()->user(),
                FinalizeUploadDTO::fromRequest($request->validated()),
            );
        } else {
            $video = $this->uploadService->createVideo(
                auth()->user(),
                CreateVideoDTO::fromRequest($request->validated()),
            );
        }

        return $this->json(new VideoResource($video), 202);
    }

    /**
     * Get a specific video by UUID.
     *
     * @param string $vuid Video UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     *
     * @return JsonResponse Video with full metadata
     */
    public function show(string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('view', $video);

        $video->load('channel');
        $video->channel->loadCount('subscribers');

        return $this->json(new VideoResource($video));
    }

    /**
     * Update a video's metadata.
     *
     * @param UpdateVideoRequest $request Partial payload
     * @param string $vuid Video UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     *
     * @return JsonResponse Updated video
     */
    public function update(UpdateVideoRequest $request, string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('update', $video);

        $updated = $this->publishingService->updateVideo($video, UpdateVideoDTO::fromRequest($request->validated()));

        return $this->json(new VideoResource($updated->load('channel')));
    }

    /**
     * Delete a video permanently.
     *
     * @param string $vuid Video UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     *
     * @return Response HTTP 204 No Content
     */
    public function destroy(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('delete', $video);

        $this->uploadService->deleteVideo($video);

        return $this->noContent();
    }

    /**
     * Record that a user viewed a video.
     *
     * @param RecordViewRequest $request Optional body: source, session_id
     * @param string $vuid Video UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     *
     * @return Response HTTP 204 No Content
     */
    public function recordView(RecordViewRequest $request, string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $validated = $request->validated();

        $source = isset($validated['source']) ? \App\Enums\VideoSource::from($validated['source']) : null;
        $sessionId = $validated['session_id'] ?? null;

        $this->reactionService->recordView(
            auth()->user(),
            $video,
            $source,
            $sessionId,
        );

        return $this->noContent();
    }

    /**
     * Toggle like status for a video.
     *
     * @param string $vuid Video UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     *
     * @return Response HTTP 204 No Content
     */
    public function toggleLike(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->reactionService->toggleLike(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Toggle dislike status for a video.
     *
     * @param string $vuid Video UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     *
     * @return Response HTTP 204 No Content
     */
    public function toggleDislike(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->reactionService->toggleDislike(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Toggle save status for a video.
     *
     * @param string $vuid Video UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     *
     * @return Response HTTP 204 No Content
     */
    public function toggleSave(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->reactionService->toggleSave(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Update user's watch progress for a video.
     *
     * @param UpdateProgressRequest $request Validated: percent (0-100)
     * @param string $vuid Video UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     *
     * @return Response HTTP 204 No Content
     */
    public function updateProgress(UpdateProgressRequest $request, string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $this->progressService->updateProgress(auth()->user(), $video, $request->validated()['percent']);

        return $this->noContent();
    }

    /**
     * Get AI-generated summary for a video.
     *
     * @param string $vuid Video UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     *
     * @return JsonResponse {keyPoints: string[], chapters: {timestamp, title}[], readingMode: string}
     */
    public function summary(string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);

        $summary = $this->aiService->getSummary($video);

        return $this->json(new VideoSummaryResource($summary));
    }

    /**
     * Get the speech-to-text transcription for a video.
     *
     * Returns the transcription record if it exists, or a 404 when no
     * transcription has been started yet (e.g. video still processing).
     *
     * @param string $vuid Video public identifier
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     *
     * @return JsonResponse {status: string, language: string|null, content: string|null}
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
     * @param string $vuid Video public identifier
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     *
     * @return Response HTTP 204 No Content
     */
    public function retryTranscription(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('retryTranscription', $video);

        $searchAttributes = ['video_id' => $video->id];
        $updateData = ['status' => TranscriptionStatus::PENDING, 'content' => null, 'language' => null];

        Transcription::updateOrCreate($searchAttributes, $updateData);

        dispatch(new TranscribeVideo($video));

        return $this->noContent();
    }

    /**
     * Get pending AI suggestions for a video.
     *
     * @param string $vuid Video public identifier
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     *
     * @return JsonResponse AI suggestion or 404
     */
    public function aiSuggestion(string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('manageSuggestion', $video);

        $suggestion = $video->aiSuggestion;

        $hasSuggestion = $suggestion !== null;

        if (!$hasSuggestion) {
            return $this->json(['message' => 'No AI suggestions available.'], 404);
        }

        return $this->json(new VideoAiSuggestionResource($suggestion));
    }

    /**
     * Accept pending AI suggestions and apply to video.
     *
     * @param string $vuid Video public identifier
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     *
     * @return Response HTTP 204 No Content
     */
    public function acceptSuggestion(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('manageSuggestion', $video);

        $this->aiService->acceptAiSuggestion($video);

        return $this->noContent();
    }

    /**
     * Publish a draft video, making it publicly visible.
     *
     * @param string $vuid Video public identifier
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     *
     * @return JsonResponse Published video resource
     */
    public function publish(string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('publish', $video);

        $this->publishingService->publishVideo($video);

        return $this->json(new VideoResource($video->fresh('channel')));
    }

    /**
     * Dismiss pending AI suggestions without applying them.
     *
     * @param string $vuid Video public identifier
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     *
     * @return Response HTTP 204 No Content
     */
    public function dismissSuggestion(string $vuid): Response
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('manageSuggestion', $video);

        $this->aiService->dismissAiSuggestion($video);

        return $this->noContent();
    }

    /**
     * Get personalized video recommendations for the authenticated user.
     *
     * @param Request $request Query: page? (default 1)
     *
     * @return JsonResponse array{data: Video[], meta: {total: int, page: int, ...}}
     */
    public function recommendations(Request $request): JsonResponse
    {
        $page = (int) $request->query('page', '1');
        $items = $this->recommendationService->forUser($request->user(), $page);

        return $this->json(VideoResource::collection($items));
    }
}

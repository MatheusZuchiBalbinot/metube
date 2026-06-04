<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\UpdateVideoDTO;
use App\DTOs\VideoListFilterDTO;
use App\Enums\VideoSource;
use App\Enums\VideoStatus;
use App\Http\Requests\Video\RecordViewRequest;
use App\Http\Requests\Video\StoreVideoRequest;
use App\Http\Requests\Video\UpdateProgressRequest;
use App\Http\Requests\Video\UpdateVideoRequest;
use App\Http\Resources\TranscriptionResource;
use App\Http\Resources\VideoAiSuggestionResource;
use App\Http\Resources\VideoResource;
use App\Http\Resources\VideoSummaryResource;
use App\Models\Video;
use App\Services\RecommendationService;
use App\Services\TranscriptionService;
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
 * Responsibility: Parse input, call service, format response.
 * Authorization is enforced by route ->can() middleware in api.php.
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
        private readonly TranscriptionService $transcriptionService,
        private readonly RecommendationService $recommendationService,
    ) {}

    /**
     * List all videos with pagination and filters.
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
     * @return JsonResponse 202 Accepted — still processing
     */
    public function store(StoreVideoRequest $request): JsonResponse
    {
        $video = $this->uploadService->handleUpload(auth()->user(), $request->validated());

        return $this->json(new VideoResource($video), 202);
    }

    /**
     * Get a specific video with subscriber count.
     */
    public function show(Video $video): JsonResponse
    {
        $video->channel->loadCount('subscribers');

        return $this->json(new VideoResource($video));
    }

    /**
     * Update a video's metadata.
     */
    public function update(UpdateVideoRequest $request, Video $video): JsonResponse
    {
        $updated = $this->publishingService->updateVideo($video, UpdateVideoDTO::fromRequest($request->validated()));

        return $this->json(new VideoResource($updated->load('channel')));
    }

    /**
     * Delete a video permanently.
     *
     * @return Response HTTP 204 No Content
     */
    public function destroy(Video $video): Response
    {
        $this->uploadService->deleteVideo($video);

        return $this->noContent();
    }

    /**
     * Record that a user viewed a video.
     *
     * @return Response HTTP 204 No Content
     */
    public function recordView(RecordViewRequest $request, Video $video): Response
    {
        $validated = $request->validated();

        $source = isset($validated['source']) ? VideoSource::from($validated['source']) : null;
        $sessionId = $validated['session_id'] ?? null;

        $this->reactionService->recordView(auth()->user(), $video, $source, $sessionId);

        return $this->noContent();
    }

    /**
     * Toggle like status for a video.
     *
     * @return Response HTTP 204 No Content
     */
    public function toggleLike(Video $video): Response
    {
        $this->reactionService->toggleLike(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Toggle dislike status for a video.
     *
     * @return Response HTTP 204 No Content
     */
    public function toggleDislike(Video $video): Response
    {
        $this->reactionService->toggleDislike(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Toggle save status for a video.
     *
     * @return Response HTTP 204 No Content
     */
    public function toggleSave(Video $video): Response
    {
        $this->reactionService->toggleSave(auth()->user(), $video);

        return $this->noContent();
    }

    /**
     * Update user's watch progress for a video.
     *
     * @return Response HTTP 204 No Content
     */
    public function updateProgress(UpdateProgressRequest $request, Video $video): Response
    {
        $this->progressService->updateProgress(auth()->user(), $video, $request->validated()['percent']);

        return $this->noContent();
    }

    /**
     * Get AI-generated summary for a video.
     */
    public function summary(Video $video): JsonResponse
    {
        $summary = $this->aiService->getSummary($video);

        return $this->json(new VideoSummaryResource($summary));
    }

    /**
     * Get the speech-to-text transcription for a video, or 404 when not started.
     */
    public function transcription(Video $video): JsonResponse
    {
        $transcription = $this->transcriptionService->findForVideo($video);

        $hasTranscription = $transcription !== null;

        if (!$hasTranscription) {
            return $this->json(['message' => 'Transcription not available.'], 404);
        }

        return $this->json(new TranscriptionResource($transcription));
    }

    /**
     * Retry a failed transcription.
     *
     * @return Response HTTP 204 No Content
     */
    public function retryTranscription(Video $video): Response
    {
        $this->transcriptionService->resetForRetry($video);

        return $this->noContent();
    }

    /**
     * Get pending AI suggestions for a video, or 404 when none exist.
     */
    public function aiSuggestion(Video $video): JsonResponse
    {
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
     * @return Response HTTP 204 No Content
     */
    public function acceptSuggestion(Video $video): Response
    {
        $this->aiService->acceptAiSuggestion($video);

        return $this->noContent();
    }

    /**
     * Publish a draft video, making it publicly visible.
     */
    public function publish(Video $video): JsonResponse
    {
        $isNotDraft = $video->status !== VideoStatus::DRAFT;

        if ($isNotDraft) {
            abort(409, 'Video is not in draft status.');
        }

        $this->publishingService->publishVideo($video);

        return $this->json(new VideoResource($video->fresh('channel')));
    }

    /**
     * Dismiss pending AI suggestions without applying them.
     *
     * @return Response HTTP 204 No Content
     */
    public function dismissSuggestion(Video $video): Response
    {
        $this->aiService->dismissAiSuggestion($video);

        return $this->noContent();
    }

    /**
     * Get personalized video recommendations for the authenticated user.
     */
    public function recommendations(Request $request): JsonResponse
    {
        $page = (int) $request->query('page', '1');
        $items = $this->recommendationService->forUser($request->user(), $page);

        return $this->json(VideoResource::collection($items));
    }
}

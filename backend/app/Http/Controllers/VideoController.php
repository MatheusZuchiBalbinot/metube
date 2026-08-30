<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\UpdateVideoDTO;
use App\DTOs\VideoListFilterDTO;
use App\Enums\VideoSource;
use App\Enums\VideoStatus;
use App\Http\Requests\Video\IndexVideoRequest;
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
     *
     * A non-published `status` filter is a privileged read, enforced by
     * {@see IndexVideoRequest::authorize()} and scoped to the requester's own
     * channel by {@see VideoService::listVideos()}.
     */
    public function index(IndexVideoRequest $request): JsonResponse
    {
        $filters = VideoListFilterDTO::fromArray($request->validated());
        $videos = $this->videoService->listVideos($filters, $request->user());

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

    public function update(UpdateVideoRequest $request, Video $video): JsonResponse
    {
        $dto = UpdateVideoDTO::fromRequest($request->validated());
        $updated = $this->publishingService->updateVideo($video, $dto);

        return $this->json(new VideoResource($updated->load('channel')));
    }

    /**
     * Delete a video permanently.
     */
    public function destroy(Video $video): Response
    {
        $this->uploadService->deleteVideo($video);

        return $this->noContent();
    }

    public function recordView(RecordViewRequest $request, Video $video): Response
    {
        $validated = $request->validated();

        $source = isset($validated['source']) ? VideoSource::from($validated['source']) : null;
        $sessionId = $validated['session_id'] ?? null;

        $this->reactionService->recordView(auth()->user(), $video, $source, $sessionId);

        return $this->noContent();
    }

    public function toggleLike(Video $video): Response
    {
        $this->reactionService->toggleLike(auth()->user(), $video);

        return $this->noContent();
    }

    public function toggleDislike(Video $video): Response
    {
        $this->reactionService->toggleDislike(auth()->user(), $video);

        return $this->noContent();
    }

    public function toggleSave(Video $video): Response
    {
        $this->reactionService->toggleSave(auth()->user(), $video);

        return $this->noContent();
    }

    public function updateProgress(UpdateProgressRequest $request, Video $video): Response
    {
        $this->progressService->updateProgress(auth()->user(), $video, $request->validated()['percent']);

        return $this->noContent();
    }

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

    public function acceptSuggestion(Video $video): Response
    {
        $this->aiService->acceptAiSuggestion($video);

        return $this->noContent();
    }

    public function publish(Video $video): JsonResponse
    {
        $isNotDraft = $video->status !== VideoStatus::DRAFT;

        if ($isNotDraft) {
            abort(409, 'Video is not in draft status.');
        }

        $this->publishingService->publishVideo($video);

        return $this->json(new VideoResource($video->fresh('channel')));
    }

    public function dismissSuggestion(Video $video): Response
    {
        $this->aiService->dismissAiSuggestion($video);

        return $this->noContent();
    }

    public function recommendations(Request $request): JsonResponse
    {
        $page = (int) $request->query('page', '1');
        $items = $this->recommendationService->forUser($request->user(), $page);

        return $this->json(VideoResource::collection($items));
    }

    /**
     * Get videos related to a specific video (for the watch-page sidebar).
     */
    public function related(Video $video): JsonResponse
    {
        $items = $this->recommendationService->relatedTo($video);

        return $this->json(VideoResource::collection($items));
    }
}

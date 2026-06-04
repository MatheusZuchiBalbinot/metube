<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\ChatAnswerDTO;
use App\Http\Requests\Video\VideoChatRequest;
use App\Http\Resources\VideoChatAnswerResource;
use App\Services\IAService;
use App\Services\VideoAiService;
use App\Services\VideoService;
use Illuminate\Http\JsonResponse;
use Throwable;

/**
 * VideoChatController — Handles contextual AI chat requests for a video.
 *
 * Uses the video's transcription and AI summary as a system prompt so the
 * model answers questions grounded in the actual video content.
 */
class VideoChatController extends Controller
{
    public function __construct(
        private readonly VideoService $videoService,
        private readonly VideoAiService $videoAiService,
        private readonly IAService $iaService,
    ) {}

    /**
     * Ask the AI a question about a specific video.
     *
     * @param VideoChatRequest $request Validated question + conversation history
     * @param string $vuid Video unique ID
     *
     * @return JsonResponse 200 { answer: string } or 422 if context unavailable
     */
    public function __invoke(VideoChatRequest $request, string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $video->loadMissing(['transcription', 'summary']);

        $transcription = $video->transcription;
        $isTranscriptionReady = $transcription !== null && $transcription->isReadyForChat();

        if (!$isTranscriptionReady) {
            return $this->json(['message' => 'Transcription is not available yet.'], 422);
        }

        $systemPrompt = $this->videoAiService->buildVideoSystemPrompt($video, (string) $transcription->content);

        /** @var string $question */
        $question = $request->input('question');

        /** @var list<array{role: string, content: string}> $history */
        $history = $request->input('history', []);

        try {
            $answer = $this->iaService->chat($question, $systemPrompt, $history);
        } catch (Throwable) {
            return $this->json(['message' => 'The AI service failed to respond. Please try again.'], 503);
        }

        $dto = new ChatAnswerDTO(answer: $answer);

        return $this->json(new VideoChatAnswerResource($dto));
    }
}

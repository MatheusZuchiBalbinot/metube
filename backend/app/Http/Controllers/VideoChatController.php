<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\AI\Contracts\AiClient;
use App\DTOs\ChatAnswerDTO;
use App\Http\Requests\Video\VideoChatRequest;
use App\Http\Resources\VideoChatAnswerResource;
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
        private readonly AiClient $aiClient,
    ) {}

    public function __invoke(VideoChatRequest $request, string $vuid): JsonResponse
    {
        $video = $this->videoService->getVideoByUuid($vuid);
        $this->authorize('view', $video);
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
            $answer = $this->aiClient->chat($question, $systemPrompt, $history);
        } catch (Throwable) {
            return $this->json(['message' => 'The AI service failed to respond. Please try again.'], 503);
        }

        $dto = new ChatAnswerDTO(answer: $answer);

        return $this->json(new VideoChatAnswerResource($dto));
    }
}

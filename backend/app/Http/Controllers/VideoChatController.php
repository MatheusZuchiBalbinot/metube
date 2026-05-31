<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\ChatAnswerDTO;
use App\Enums\TranscriptionLimit;
use App\Enums\TranscriptionStatus;
use App\Http\Requests\Video\VideoChatRequest;
use App\Http\Resources\VideoChatAnswerResource;
use App\Services\IAService;
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

        $isTranscriptionReady = $transcription !== null
            && $transcription->status === TranscriptionStatus::COMPLETED
            && is_string($transcription->content)
            && $transcription->content !== '';

        if (!$isTranscriptionReady) {
            return $this->json(['message' => 'Transcription is not available yet.'], 422);
        }

        $systemPrompt = $this->buildSystemPrompt($video, $transcription->content);

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

    /**
     * Build the system prompt from the video's metadata and context.
     *
     * @param string $transcriptionContent Full transcription text
     */
    private function buildSystemPrompt(\App\Models\Video $video, string $transcriptionContent): string
    {
        $truncatedTranscription = mb_substr($transcriptionContent, 0, TranscriptionLimit::MAX_CHARS_FOR_CHAT->value);

        $prompt = <<<PROMPT
You are a helpful assistant answering questions about a specific video. Use only the information provided below to answer. If the answer is not in the video content, say so clearly.

VIDEO TITLE: {$video->title}
PROMPT;

        $hasDescription = $video->description !== '';

        if ($hasDescription) {
            $prompt .= "\nVIDEO DESCRIPTION: {$video->description}";
        }

        $summary = $video->summary;
        $hasReadingMode = $summary !== null && $summary->reading_mode !== null && $summary->reading_mode !== '';

        if ($hasReadingMode) {
            $prompt .= "\n\nSUMMARY:\n{$summary->reading_mode}";
        }

        $hasKeyPoints = $summary !== null && count($summary->key_points) > 0;

        if ($hasKeyPoints) {
            $keyPoints = implode("\n- ", $summary->key_points);
            $prompt .= "\n\nKEY POINTS:\n- {$keyPoints}";
        }

        $prompt .= "\n\nFULL TRANSCRIPTION:\n{$truncatedTranscription}";

        return $prompt;
    }
}

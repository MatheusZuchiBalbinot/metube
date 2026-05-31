<?php

declare(strict_types=1);

namespace App\Services;

use App\AI\Clients\GroqClient;
use Illuminate\Http\Client\RequestException;
use RuntimeException;

/**
 * IAService — Wrapper around Groq API for video content analysis.
 *
 * Delegates HTTP communication to GroqClient and focuses on:
 *   - JSON extraction and parsing for generate()
 *   - Multi-turn chat responses for chat()
 */
class IAService
{
    public function __construct(private readonly GroqClient $groq) {}

    /**
     * Send a prompt and return the parsed JSON response body.
     *
     * @param string $prompt Full prompt text to send
     *
     * @throws RequestException When the API returns a non-2xx response
     * @throws RuntimeException When the response cannot be decoded as JSON
     *
     * @return array<string, mixed> Decoded JSON from the model
     */
    public function generate(string $prompt): array
    {
        $text = $this->groq->generateJson($prompt);

        /** @var array<string, mixed>|null $decoded */
        $decoded = json_decode($text, true);

        $isInvalidJson = !is_array($decoded);

        if ($isInvalidJson) {
            throw new RuntimeException('AI service response is not valid JSON: ' . $text);
        }

        return $decoded;
    }

    /**
     * Send a multi-turn chat request and return the plain-text response.
     *
     * @param string $question The user's question for this turn
     * @param string $systemPrompt System instructions (video context)
     * @param array<int, array{role: string, content: string}> $history Previous turns
     *
     * @throws RequestException When the API returns a non-2xx response
     * @throws RuntimeException When the response is missing
     *
     * @return string The model's plain-text answer
     */
    public function chat(string $question, string $systemPrompt, array $history): string
    {
        return $this->groq->chat($question, $systemPrompt, $history);
    }
}

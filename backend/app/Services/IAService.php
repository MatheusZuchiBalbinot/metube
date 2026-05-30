<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * IAService — Thin wrapper around the Groq REST API (OpenAI-compatible).
 *
 * Provides two modes of interaction:
 *   - generate(): single-turn JSON extraction (video metadata, summaries)
 *   - chat(): multi-turn conversational Q&A with a system prompt
 */
class IAService
{
    private string $apiKey;

    private string $model;

    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) config('services.ai.key');
        $this->model = (string) config('services.ai.model', 'llama-3.3-70b-versatile');
        $this->baseUrl = (string) config('services.ai.url', 'https://api.groq.com/openai/v1');
    }

    /**
     * Send a prompt and return the parsed JSON response body.
     *
     * @param  string  $prompt  Full prompt text to send
     * @return array<string, mixed> Decoded JSON from the model
     *
     * @throws ConnectionException When the API is unreachable
     * @throws RequestException When the API returns a non-2xx response
     * @throws \RuntimeException When the response cannot be decoded as JSON
     */
    public function generate(string $prompt): array
    {
        $response = Http::withToken($this->apiKey)
            ->timeout(60)
            ->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a video content analyzer. Always respond with valid JSON only — no markdown, no explanation, no code blocks.',
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt,
                    ],
                ],
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.3,
            ])
            ->throw();

        $text = $response->json('choices.0.message.content');

        $isTextMissing = ! is_string($text) || $text === '';
        if ($isTextMissing) {
            throw new \RuntimeException('AI service returned an empty response.');
        }

        /** @var array<string, mixed>|null $decoded */
        $decoded = json_decode($text, true);

        $isInvalidJson = ! is_array($decoded);
        if ($isInvalidJson) {
            throw new \RuntimeException('AI service response is not valid JSON: '.$text);
        }

        return $decoded;
    }

    /**
     * Send a multi-turn chat request and return the plain-text response.
     *
     * @param  string  $question  The user's question for this turn
     * @param  string  $systemPrompt  System instructions (video context)
     * @param  array<int, array{role: string, content: string}>  $history  Previous turns
     * @return string The model's plain-text answer
     *
     * @throws ConnectionException When the API is unreachable
     * @throws RequestException When the API returns a non-2xx response
     * @throws \RuntimeException When the response content is missing
     */
    public function chat(string $question, string $systemPrompt, array $history): string
    {
        $messages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $history,
            [['role' => 'user', 'content' => $question]],
        );

        $response = Http::withToken($this->apiKey)
            ->timeout(60)
            ->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->model,
                'messages' => $messages,
                'temperature' => 0.5,
            ])
            ->throw();

        $text = $response->json('choices.0.message.content');

        $isTextMissing = ! is_string($text) || $text === '';
        if ($isTextMissing) {
            throw new \RuntimeException('AI service returned an empty chat response.');
        }

        return $text;
    }
}

<?php

declare(strict_types=1);

namespace App\AI\Clients;

use App\AI\Contracts\AiClient;
use App\AI\Contracts\AiPrompt;
use App\Enums\ApiTimeout;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Groq AI provider client (OpenAI-compatible).
 *
 * Handles HTTP communication with the Groq REST API for:
 * - Prompt-based JSON extraction (via execute())
 * - Multi-turn conversational responses (via chat())
 */
class GroqClient implements AiClient
{
    private readonly string $apiKey;

    private readonly string $model;

    private readonly string $baseUrl;

    private readonly int $timeout;

    public function __construct(
        ?string $apiKey = null,
        ?string $model = null,
        ?string $baseUrl = null,
        ?int $timeout = null,
    ) {
        $this->apiKey = $apiKey ?? (string) config('services.ai.key');
        $this->model = $model ?? (string) config('services.ai.model', 'llama-3.3-70b-versatile');
        $this->baseUrl = $baseUrl ?? (string) config('services.ai.url', 'https://api.groq.com/openai/v1');
        $this->timeout = $timeout ?? ApiTimeout::CHAT_COMPLETION->value;
    }

    /**
     * Execute an AiPrompt and return the parsed result.
     *
     * @param AiPrompt $prompt The prompt to execute
     *
     * @throws RequestException When the API returns a non-2xx response
     * @throws RuntimeException When the response is not valid JSON or required keys are missing
     *
     * @return mixed The prompt's parse() result
     */
    public function execute(AiPrompt $prompt): mixed
    {
        $text = $this->generateJson($prompt->buildPrompt());

        /** @var array<string, mixed>|null $decoded */
        $decoded = json_decode($text, true);

        $isInvalidJson = !\is_array($decoded);

        if ($isInvalidJson) {
            throw new RuntimeException('AI service response is not valid JSON: ' . $text);
        }

        foreach ($prompt->requiredKeys() as $key) {
            $isMissing = !\array_key_exists($key, $decoded);

            if ($isMissing) {
                throw new RuntimeException("AI response missing required key '{$key}'");
            }
        }

        return $prompt->parse($decoded);
    }

    /**
     * Send a prompt for JSON extraction and return the response content.
     *
     * @param string $prompt Full prompt text to send
     *
     * @throws RequestException When the API returns a non-2xx response
     * @throws RuntimeException When the response content is missing or invalid
     *
     * @return string The plain-text response from the model
     */
    public function generateJson(string $prompt): string
    {
        $payload = [
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
        ];

        return $this->send($payload);
    }

    /**
     * Send a multi-turn chat request and return the plain-text response.
     *
     * @param string $question The user's question for this turn
     * @param string $systemPrompt System instructions
     * @param array<int, array{role: string, content: string}> $history Previous turns
     *
     * @throws RequestException When the API returns a non-2xx response
     * @throws RuntimeException When the response content is missing
     *
     * @return string The model's plain-text answer
     */
    public function chat(string $question, string $systemPrompt, array $history): string
    {
        $messages = array_merge([['role' => 'system', 'content' => $systemPrompt]], $history,
            [['role' => 'user', 'content' => $question]],
        );

        $payload = [
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => 0.5,
        ];

        return $this->send($payload);
    }

    /**
     * Send the payload and extract the response text.
     *
     * @param array<string, mixed> $payload
     *
     * @throws RequestException
     * @throws RuntimeException
     *
     * @return string The response content
     */
    private function send(array $payload): string
    {
        $response = Http::withToken($this->apiKey)
            ->timeout($this->timeout)
            ->post("{$this->baseUrl}/chat/completions", $payload)
            ->throw();

        $text = $response->json('choices.0.message.content');

        $isTextMissing = !is_string($text) || $text === '';
        if ($isTextMissing) {
            throw new RuntimeException('AI service returned an empty response.');
        }

        return $text;
    }
}

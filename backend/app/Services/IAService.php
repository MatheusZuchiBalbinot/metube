<?php

declare(strict_types=1);

namespace App\Services;

use App\AI\Contracts\AiClient;
use App\Exceptions\InvalidAiResponseException;
use Illuminate\Http\Client\RequestException;

/**
 * IAService — Multi-turn chat wrapper around an AI client.
 */
final class IAService
{
    public function __construct(private readonly AiClient $client) {}

    /**
     * Send a multi-turn chat request and return the plain-text response.
     *
     * @param string $question The user's question for this turn
     * @param string $systemPrompt System instructions (video context)
     * @param array<int, array{role: string, content: string}> $history Previous turns
     *
     * @throws RequestException When the API returns a non-2xx response
     * @throws InvalidAiResponseException When the response is missing
     *
     * @return string The model's plain-text answer
     */
    public function chat(string $question, string $systemPrompt, array $history): string
    {
        return $this->client->chat($question, $systemPrompt, $history);
    }
}

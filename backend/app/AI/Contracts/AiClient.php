<?php

declare(strict_types=1);

namespace App\AI\Contracts;

use App\Exceptions\AiException;
use App\Exceptions\InvalidAiResponseException;
use Illuminate\Http\Client\RequestException;

/**
 * Interface for AI provider clients.
 *
 * Clients handle HTTP communication and response parsing.
 * Prompts encapsulate the request structure and parsing logic.
 */
interface AiClient
{
    /**
     * Execute a prompt against the AI provider.
     *
     * @param AiPrompt $prompt The prompt with request structure and parser
     *
     * @throws AiException On API errors
     *
     * @return mixed The parsed response (DTO or array)
     */
    public function execute(AiPrompt $prompt): mixed;

    /**
     * Send a multi-turn chat request and return the plain-text response.
     *
     * @param string $question The user's question for this turn
     * @param string $systemPrompt System instructions
     * @param array<int, array{role: string, content: string}> $history Previous turns
     *
     * @throws RequestException When the API returns a non-2xx response
     * @throws InvalidAiResponseException When the response content is missing
     *
     * @return string The model's plain-text answer
     */
    public function chat(string $question, string $systemPrompt, array $history): string;
}

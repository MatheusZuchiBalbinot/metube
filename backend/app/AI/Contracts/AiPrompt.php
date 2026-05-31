<?php

declare(strict_types=1);

namespace App\AI\Contracts;

use RuntimeException;

/**
 * Interface for AI prompts.
 *
 * Prompts encapsulate:
 * - The request structure (buildRequest() for HTTP payload)
 * - Response parsing (parse() to convert API response to DTO or array)
 */
interface AiPrompt
{
    /**
     * Build the request payload for the AI provider.
     *
     * @return array<string, mixed> The HTTP request body
     */
    public function buildRequest(): array;

    /**
     * Parse and validate the AI provider response.
     *
     * @param array<string, mixed> $response Raw API response
     *
     * @throws RuntimeException If required keys are missing or invalid
     *
     * @return mixed The parsed result (DTO, array, or other)
     */
    public function parse(array $response): mixed;
}

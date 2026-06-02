<?php

declare(strict_types=1);

namespace App\AI\Contracts;

use App\Exceptions\InvalidAiResponseException;

/**
 * Interface for AI prompts.
 *
 * Prompts encapsulate:
 * - The text prompt (buildPrompt()) sent to the AI model
 * - Required response keys (requiredKeys()) for validation
 * - Response parsing (parse()) to convert decoded JSON to a DTO
 */
interface AiPrompt
{
    /**
     * Build the plain-text prompt to send to the AI model.
     *
     * @return string The prompt text
     */
    public function buildPrompt(): string;

    /**
     * Return the list of JSON keys that must be present in the response.
     *
     * @return string[]
     */
    public function requiredKeys(): array;

    /**
     * Parse and validate the decoded JSON response from the AI model.
     *
     * @param array<string, mixed> $raw Decoded JSON response
     *
     * @throws InvalidAiResponseException If required keys are missing or invalid
     *
     * @return mixed The parsed result (DTO, array, or other)
     */
    public function parse(array $raw): mixed;
}

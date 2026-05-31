<?php

namespace App\AI\Contracts;

/**
 * Interface for AI prompts — encapsulates prompt generation and response parsing.
 *
 * Implementations define a specific task (e.g., metadata extraction, content moderation)
 * and handle both the prompt construction and typed response parsing.
 */
interface AiPrompt
{
    /**
     * Build the prompt text to send to the AI service.
     */
    public function build(): string;

    /**
     * Parse the raw JSON response from the AI and return a typed result.
     *
     * @param  array<string, mixed>  $raw
     */
    public function parse(array $raw): mixed;

    /**
     * Return the list of required keys in the response.
     *
     * @return string[]
     */
    public function requiredKeys(): array;
}

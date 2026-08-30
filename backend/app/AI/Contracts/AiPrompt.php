<?php

declare(strict_types=1);

namespace App\AI\Contracts;

use App\Exceptions\InvalidAiResponseException;

interface AiPrompt
{
    public function buildPrompt(): string;

    /**
     * @return array<string>
     */
    public function requiredKeys(): array;

    /**
     * @param array<string, mixed> $raw Decoded JSON response
     *
     * @throws InvalidAiResponseException If required keys are missing or invalid
     */
    public function parse(array $raw): mixed;
}

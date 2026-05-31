<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class UpdateUserProfileDTO
{
    public function __construct(
        public ?string $name = null,
        public ?string $bio = null,
    ) {}

    /**
     * Build from a validated FormRequest payload.
     *
     * @param array<string, mixed> $validated
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            name: $validated['name'] ?? null,
            bio: $validated['bio'] ?? null,
        );
    }
}

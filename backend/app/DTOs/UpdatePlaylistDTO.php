<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class UpdatePlaylistDTO
{
    public function __construct(
        public string $name,
    ) {}

    /**
     * @param array<string, mixed> $validated
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            name: $validated['name'],
        );
    }
}

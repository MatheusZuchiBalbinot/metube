<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class StoreCommentDTO
{
    public function __construct(
        public string $content,
        public ?string $parentCuid = null,
    ) {}

    /**
     * Build from a validated FormRequest payload.
     *
     * @param array<string, mixed> $validated
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            content: $validated['content'],
            parentCuid: $validated['parent_cuid'] ?? null,
        );
    }
}

<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class ReorderPlaylistVideosDTO
{
    /**
     * @param list<string> $vuids Ordered list of video UUIDs
     */
    public function __construct(
        public array $vuids,
    ) {}

    /**
     * @param array<string, mixed> $validated
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            vuids: $validated['vuids'],
        );
    }
}

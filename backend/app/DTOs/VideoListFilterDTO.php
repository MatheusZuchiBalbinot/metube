<?php

declare(strict_types=1);

namespace App\DTOs;

/**
 * VideoListFilterDTO - Typed parameters for video list queries.
 */
class VideoListFilterDTO
{
    /**
     * @param list<string>|null $tags
     */
    public function __construct(
        public readonly int $page = 1,
        public readonly ?string $search = null,
        public readonly ?array $tags = null,
        public readonly ?string $status = null,
    ) {}

    /**
     * Create from a request query array.
     *
     * @param array<string, mixed> $filters
     */
    public static function fromArray(array $filters): self
    {
        return new self(
            page: (int) ($filters['page'] ?? 1),
            search: $filters['search'] ?? null,
            tags: $filters['tags'] ?? null,
            status: $filters['status'] ?? null,
        );
    }

    public function hasFilters(): bool
    {
        return $this->search !== null || $this->tags !== null || $this->status !== null;
    }
}

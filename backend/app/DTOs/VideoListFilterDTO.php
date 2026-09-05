<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class VideoListFilterDTO
{
    /**
     * @param list<string>|null $tags
     */
    public function __construct(
        public int $page = 1,
        public ?string $search = null,
        public ?array $tags = null,
        public ?string $status = null,
    ) {}

    /**
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

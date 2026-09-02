<?php

declare(strict_types=1);

namespace App\DTOs;

use Illuminate\Support\Carbon;

final readonly class UpdateVideoDTO
{
    /**
     * @param list<string>|null $tags
     */
    public function __construct(
        public ?string $title,
        public ?string $description,
        public ?array $tags,
        public ?Carbon $scheduledAt,
    ) {}

    /**
     * @param array<string, mixed> $validated
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            title: $validated['title'] ?? null,
            description: $validated['description'] ?? null,
            tags: $validated['tags'] ?? null,
            scheduledAt: isset($validated['scheduled_at'])
                ? Carbon::parse($validated['scheduled_at'])
                : null,
        );
    }

    /**
     * Return only the non-null fields as a DB-ready array.
     *
     * @return array<string, mixed>
     */
    public function toUpdateArray(): array
    {
        $data = [];

        if ($this->title !== null) {
            $data['title'] = $this->title;
        }

        if ($this->description !== null) {
            $data['description'] = $this->description;
        }

        if ($this->tags !== null) {
            $data['tags'] = $this->tags;
        }

        if ($this->scheduledAt !== null) {
            $data['scheduled_at'] = $this->scheduledAt;
        }

        return $data;
    }
}

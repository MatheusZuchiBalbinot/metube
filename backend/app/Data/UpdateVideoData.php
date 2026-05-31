<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\VideoStatus;
use Illuminate\Support\Carbon;

final readonly class UpdateVideoData
{
    /**
     * @param list<string>|null $tags
     */
    public function __construct(
        public ?string $title,
        public ?string $description,
        public ?array $tags,
        public ?VideoStatus $status,
        public ?Carbon $scheduledAt,
    ) {}

    /**
     * Build from a validated FormRequest payload.
     *
     * @param array<string, mixed> $validated
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            title: $validated['title'] ?? null,
            description: $validated['description'] ?? null,
            tags: $validated['tags'] ?? null,
            status: isset($validated['status']) ? VideoStatus::from($validated['status']) : null,
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

        if ($this->status !== null) {
            $data['status'] = $this->status;
        }

        if ($this->scheduledAt !== null) {
            $data['scheduled_at'] = $this->scheduledAt;
        }

        return $data;
    }
}

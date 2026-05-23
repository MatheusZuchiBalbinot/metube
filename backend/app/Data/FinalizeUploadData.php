<?php

namespace App\Data;

use App\Enums\VideoStatus;
use Illuminate\Support\Carbon;

final readonly class FinalizeUploadData
{
    /**
     * @param  list<string>  $tags
     */
    public function __construct(
        public string $uploadKey,
        public ?string $thumbnailKey,
        public string $title,
        public ?string $description,
        public array $tags,
        public VideoStatus $status,
        public ?Carbon $scheduledAt,
        public bool $isBatch = false,
    ) {}

    /**
     * Build from a validated FinalizeUploadRequest payload.
     *
     * @param  array<string, mixed>  $validated
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            uploadKey: $validated['upload_key'],
            thumbnailKey: $validated['thumbnail_key'] ?? null,
            title: $validated['title'],
            description: $validated['description'] ?? null,
            tags: $validated['tags'] ?? [],
            status: VideoStatus::from($validated['status']),
            scheduledAt: isset($validated['scheduled_at'])
                ? Carbon::parse($validated['scheduled_at'])
                : null,
            isBatch: (bool) ($validated['is_batch'] ?? false),
        );
    }
}

<?php

namespace App\Data;

use App\Enums\VideoStatus;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;

final readonly class CreateVideoData
{
    /**
     * @param  list<string>  $tags
     */
    public function __construct(
        public string $title,
        public ?string $description,
        public array $tags,
        public VideoStatus $status,
        public UploadedFile $videoFile,
        public ?UploadedFile $thumbnailFile,
        public ?Carbon $scheduledAt,
    ) {}

    /**
     * Build from a validated FormRequest payload.
     *
     * @param  array<string, mixed>  $validated
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            title: $validated['title'],
            description: $validated['description'] ?? null,
            tags: $validated['tags'] ?? [],
            status: VideoStatus::from($validated['status']),
            videoFile: $validated['video_file'],
            thumbnailFile: $validated['thumbnail_file'] ?? null,
            scheduledAt: isset($validated['scheduled_at'])
                ? Carbon::parse($validated['scheduled_at'])
                : null,
        );
    }
}

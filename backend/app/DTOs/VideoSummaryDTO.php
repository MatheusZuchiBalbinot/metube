<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Models\VideoSummary;

final readonly class VideoSummaryDTO
{
    /**
     * @param array<string> $keyPoints
     * @param array<mixed> $chapters
     */
    public function __construct(
        public array $keyPoints = [],
        public array $chapters = [],
        public string $readingMode = '',
    ) {}

    public static function fromModel(VideoSummary $summary): self
    {
        return new self(
            keyPoints: $summary->key_points ?? [],
            chapters: $summary->chapters ?? [],
            readingMode: $summary->reading_mode ?? '',
        );
    }

    public static function empty(): self
    {
        return new self();
    }
}

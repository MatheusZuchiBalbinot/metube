<?php

declare(strict_types=1);

namespace App\DTOs;

/**
 * AI-generated metadata for a video, returned after analyzing its transcription.
 */
readonly class VideoMetadataResult
{
    /**
     * @param list<string> $keyPoints 3-7 concise takeaways
     * @param list<array{timestamp: string, title: string}> $chapters Natural topic breaks with HH:MM:SS timestamps
     * @param string $readingMode Flowing prose summary (150-300 words)
     * @param list<string> $suggestedTags 3-6 lowercase tags
     * @param string $suggestedTitle Improved title (under 80 chars)
     * @param string $suggestedDescription Engaging description (80-200 chars)
     */
    public function __construct(
        public array $keyPoints,
        public array $chapters,
        public string $readingMode,
        public array $suggestedTags,
        public string $suggestedTitle,
        public string $suggestedDescription,
    ) {}
}

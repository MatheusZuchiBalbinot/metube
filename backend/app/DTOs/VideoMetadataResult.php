<?php

namespace App\DTOs;

/**
 * Result from AI-generated video metadata extraction.
 *
 * Contains key points, chapters, reading mode summary, and suggestions
 * for title, description, and tags.
 */
readonly class VideoMetadataResult
{
    /**
     * @param  string[]  $keyPoints  3–7 concise takeaways
     * @param  array<int, array{timestamp: string, title: string}>  $chapters  Natural topic breaks
     * @param  string  $readingMode  Flowing prose summary
     * @param  string[]  $suggestedTags  3–6 lowercase tags
     * @param  string  $suggestedTitle  Improved title
     * @param  string  $suggestedDescription  Improved description
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

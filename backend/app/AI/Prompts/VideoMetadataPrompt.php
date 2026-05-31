<?php

namespace App\AI\Prompts;

use App\AI\Contracts\AiPrompt;
use App\DTOs\VideoMetadataResult;
use App\Models\Video;

/**
 * Prompt for extracting video metadata (chapters, key points, suggestions).
 *
 * Analyzes video title, description, and transcription to generate:
 * - key_points: 3–7 concise takeaways
 * - chapters: detected topic breaks with timestamps
 * - reading_mode: flowing prose summary (150–300 words)
 * - suggested_title, suggested_description, suggested_tags
 *
 * All generated text is in the transcription's language.
 */
class VideoMetadataPrompt implements AiPrompt
{
    public function __construct(private readonly Video $video) {}

    public function build(): string
    {
        $title = $this->video->title;
        $description = $this->video->description ?? '';
        $content = (string) $this->video->transcription?->content;
        $lang = $this->video->transcription->language ?? 'pt';

        return <<<PROMPT
            You are a video content analyzer. Given the title, description and full transcription of a video, return ONLY valid JSON with this exact structure — no markdown, no explanation:
            {
                "key_points": ["string"],
                "chapters": [{"timestamp": "HH:MM:SS", "title": "string"}],
                "reading_mode": "string",
                "suggested_tags": ["string"],
                "suggested_title": "string",
                "suggested_description": "string"
            }

            Rules:
            - key_points: 3–7 concise takeaways, each under 120 characters
            - chapters: detect natural topic breaks (minimum 2), use HH:MM:SS format
            - reading_mode: flowing prose summary, 150–300 words
            - suggested_tags: 3–6 relevant lowercase tags, no spaces (use hyphens)
            - suggested_title: improved, engaging title under 80 characters
            - suggested_description: engaging description between 80 and 200 characters
            - IMPORTANT: ALL text fields (key_points, reading_mode, suggested_title, suggested_description) MUST be written in the same language as the transcription (language code: {$lang})

            Video title: {$title}
            Video description: {$description}
            Transcription:
            {$content}
        PROMPT;
    }

    public function requiredKeys(): array
    {
        return [
            'key_points',
            'chapters',
            'reading_mode',
            'suggested_tags',
            'suggested_title',
            'suggested_description',
        ];
    }

    public function parse(array $raw): VideoMetadataResult
    {
        return new VideoMetadataResult(
            keyPoints: (array) $raw['key_points'],
            chapters: (array) $raw['chapters'],
            readingMode: (string) $raw['reading_mode'],
            suggestedTags: (array) $raw['suggested_tags'],
            suggestedTitle: (string) $raw['suggested_title'],
            suggestedDescription: (string) $raw['suggested_description'],
        );
    }
}

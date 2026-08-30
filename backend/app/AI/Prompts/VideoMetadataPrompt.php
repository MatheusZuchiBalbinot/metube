<?php

declare(strict_types=1);

namespace App\AI\Prompts;

use App\AI\Contracts\AiPrompt;
use App\DTOs\VideoMetadataResult;
use App\Exceptions\InvalidAiResponseException;
use App\Models\Video;

class VideoMetadataPrompt implements AiPrompt
{
    public function __construct(private readonly Video $video) {}

    public function buildPrompt(): string
    {
        $title = $this->video->title;
        $lang = $this->video->transcription->language ?? 'pt';
        $description = $this->video->description ?? '';
        $content = $this->video->transcription->vtt ?? $this->video->transcription->content ?? '';

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
                - key_points: 3 to 7 concise takeaways, each under 120 characters
                - chapters: detect natural topic breaks (minimum 2), use HH:MM:SS format (no milliseconds); the transcription below is in WebVTT format — anchor each chapter to a cue start time from the VTT, then strip the sub-second part
                - reading_mode: flowing prose summary, 150 to 300 words
                - suggested_tags: 3 to 6 relevant lowercase tags, no spaces (use hyphens)
                - suggested_title: improved, engaging title under 80 characters
                - suggested_description: engaging description between 80 and 200 characters
                - IMPORTANT: ALL text fields (key_points, reading_mode, suggested_title, suggested_description) MUST be written in the same language as the transcription (language code: {$lang})

                Video title: {$title}
                Video description: {$description}
                Transcription (WebVTT):
                {$content}
            PROMPT;
    }

    /**
     * @return array<string>
     */
    public function requiredKeys(): array
    {
        return ['key_points', 'chapters', 'reading_mode', 'suggested_tags', 'suggested_title', 'suggested_description'];
    }

    /**
     * @param array<string, mixed> $raw
     *
     * @throws InvalidAiResponseException If required keys are missing
     */
    public function parse(array $raw): VideoMetadataResult
    {
        $chapters = \array_values(\array_map($this->normalizeChapter(...), (array) $raw['chapters']));

        return new VideoMetadataResult(
            keyPoints: \array_values((array) $raw['key_points']),
            chapters: $chapters,
            readingMode: (string) $raw['reading_mode'],
            suggestedTags: \array_values((array) $raw['suggested_tags']),
            suggestedTitle: (string) $raw['suggested_title'],
            suggestedDescription: (string) $raw['suggested_description'],
        );
    }

    /**
     * The sub-second portion of the timestamp is stripped so chapters anchor to whole
     * seconds (HH:MM:SS).
     *
     * @return array{timestamp: string, title: string}
     */
    private function normalizeChapter(mixed $chapter): array
    {
        $chapter = (array) $chapter;

        $hasTimestamp = isset($chapter['timestamp']) && \is_string($chapter['timestamp']);
        $timestamp = $hasTimestamp ? (string) \preg_replace('/\.\d+$/', '', $chapter['timestamp']) : '';

        $hasTitle = isset($chapter['title']) && \is_string($chapter['title']);
        $title = $hasTitle ? $chapter['title'] : '';

        return ['timestamp' => $timestamp, 'title' => $title];
    }
}

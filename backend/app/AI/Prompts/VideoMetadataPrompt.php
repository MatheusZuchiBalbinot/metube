<?php

declare(strict_types=1);

namespace App\AI\Prompts;

use App\AI\Contracts\AiPrompt;
use App\DTOs\VideoMetadataResult;
use App\Models\Video;
use RuntimeException;

class VideoMetadataPrompt implements AiPrompt
{
    public function __construct(private readonly Video $video) {}

    /**
     * Build the plain-text prompt to send to the AI model.
     *
     * @return string
     */
    public function buildPrompt(): string
    {
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

Video title: {$this->video->title}
Video description: {$description}
Transcription (WebVTT):
{$content}
PROMPT;
    }

    /**
     * Return the JSON keys that must be present in the AI response.
     *
     * @return string[]
     */
    public function requiredKeys(): array
    {
        return ['key_points', 'chapters', 'reading_mode', 'suggested_tags', 'suggested_title', 'suggested_description'];
    }

    /**
     * Parse the decoded JSON response from the AI model.
     *
     * @param array<string, mixed> $raw Decoded JSON from the model
     *
     * @throws RuntimeException If required keys are missing
     */
    public function parse(array $raw): VideoMetadataResult
    {
        $chapters = \array_values(\array_map(function (mixed $chapter): array {
            $chapter = (array) $chapter;

            if (isset($chapter['timestamp']) && \is_string($chapter['timestamp'])) {
                $chapter['timestamp'] = (string) \preg_replace('/\.\d+$/', '', $chapter['timestamp']);
            }

            return $chapter;
        }, (array) $raw['chapters']));

        return new VideoMetadataResult(
            keyPoints: \array_values((array) $raw['key_points']),
            chapters: $chapters,
            readingMode: (string) $raw['reading_mode'],
            suggestedTags: \array_values((array) $raw['suggested_tags']),
            suggestedTitle: (string) $raw['suggested_title'],
            suggestedDescription: (string) $raw['suggested_description'],
        );
    }
}

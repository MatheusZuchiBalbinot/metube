<?php

namespace App\AI\Prompts;

use App\AI\Contracts\AiPrompt;
use App\DTOs\VideoMetadataResult;
use App\Models\Video;

class VideoMetadataPrompt implements AiPrompt
{
    public function __construct(private readonly Video $video) {}

    /**
     * Build the Gemini request payload.
     *
     * @return array<string, mixed>
     */
    public function buildRequest(): array
    {
        $lang = $this->video->transcription->language ?? 'pt';
        $description = $this->video->description ?? '';
        $content = $this->video->transcription->content ?? '';

        $prompt = <<<PROMPT
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
- chapters: detect natural topic breaks (minimum 2), use HH:MM:SS format
- reading_mode: flowing prose summary, 150 to 300 words
- suggested_tags: 3 to 6 relevant lowercase tags, no spaces (use hyphens)
- suggested_title: improved, engaging title under 80 characters
- suggested_description: engaging description between 80 and 200 characters
- IMPORTANT: ALL text fields (key_points, reading_mode, suggested_title, suggested_description) MUST be written in the same language as the transcription (language code: {$lang})

Video title: {$this->video->title}
Video description: {$description}
Transcription:
{$content}
PROMPT;

        return [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                    ],
                ],
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
            ],
        ];
    }

    /**
     * Parse and validate Gemini's JSON response.
     *
     * @param  array<string, mixed>  $response  Gemini API response
     *
     * @throws \RuntimeException If required keys are missing
     */
    public function parse(array $response): VideoMetadataResult
    {
        $content = $response['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if ($content === null) {
            throw new \RuntimeException("Gemini response missing content for video {$this->video->vuid}");
        }

        $parsed = json_decode($content, true);

        if ($parsed === null) {
            throw new \RuntimeException("Gemini returned invalid JSON for video {$this->video->vuid}: {$content}");
        }

        $required = ['key_points', 'chapters', 'reading_mode', 'suggested_tags', 'suggested_title', 'suggested_description'];

        foreach ($required as $key) {
            if (! array_key_exists($key, $parsed)) {
                throw new \RuntimeException("Gemini response missing required key '{$key}' for video {$this->video->vuid}");
            }
        }

        return new VideoMetadataResult(
            keyPoints: \array_values((array) $parsed['key_points']),
            chapters: \array_values((array) $parsed['chapters']),
            readingMode: (string) $parsed['reading_mode'],
            suggestedTags: \array_values((array) $parsed['suggested_tags']),
            suggestedTitle: (string) $parsed['suggested_title'],
            suggestedDescription: (string) $parsed['suggested_description'],
        );
    }
}

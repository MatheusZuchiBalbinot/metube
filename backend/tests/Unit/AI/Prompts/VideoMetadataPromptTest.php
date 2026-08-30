<?php

declare(strict_types=1);

use App\AI\Prompts\VideoMetadataPrompt;
use App\DTOs\VideoMetadataResult;
use App\Models\Video;

describe('VideoMetadataPrompt', function () {
    test('buildPrompt returns text containing video info and VTT transcription', function () {
        $video = new Video([
            'title' => 'Test Video',
            'description' => 'Test description',
        ]);
        $video->transcription = (object) [
            'content' => 'Full transcription text',
            'vtt' => "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nFull transcription text",
            'language' => 'pt',
        ];

        $prompt = new VideoMetadataPrompt($video);
        $text = $prompt->buildPrompt();

        expect($text)
            ->toBeString()
            ->toContain('Test Video')
            ->toContain('WEBVTT')
            ->toContain('00:00:00.000 --> 00:00:05.000')
            ->toContain('language code: pt');
    });

    test('buildPrompt falls back to plain content when vtt is null', function () {
        $video = new Video([
            'title' => 'Test Video',
            'description' => '',
        ]);
        $video->transcription = (object) [
            'content' => 'Plain text transcription',
            'vtt' => null,
            'language' => 'en',
        ];

        $prompt = new VideoMetadataPrompt($video);
        $text = $prompt->buildPrompt();

        expect($text)->toContain('Plain text transcription');
    });

    test('requiredKeys returns all expected keys', function () {
        $video = new Video();
        $prompt = new VideoMetadataPrompt($video);

        expect($prompt->requiredKeys())->toBe([
            'key_points', 'chapters', 'reading_mode',
            'suggested_tags', 'suggested_title', 'suggested_description',
        ]);
    });

    test('parse returns VideoMetadataResult from decoded JSON', function () {
        $video = new Video(['vuid' => 'test-vuid']);

        $raw = [
            'key_points' => ['Point 1', 'Point 2'],
            'chapters' => [['timestamp' => '00:01:00', 'title' => 'Intro']],
            'reading_mode' => 'Summary text here.',
            'suggested_tags' => ['tag1', 'tag2'],
            'suggested_title' => 'New Title',
            'suggested_description' => 'New description',
        ];

        $prompt = new VideoMetadataPrompt($video);
        $result = $prompt->parse($raw);

        expect($result)->toBeInstanceOf(VideoMetadataResult::class);
        expect($result->keyPoints)->toBe(['Point 1', 'Point 2']);
        expect($result->suggestedTitle)->toBe('New Title');
    });
});

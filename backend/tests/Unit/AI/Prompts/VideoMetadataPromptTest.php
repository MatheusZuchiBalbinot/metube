<?php

use App\AI\Prompts\VideoMetadataPrompt;
use App\DTOs\VideoMetadataResult;
use App\Models\Transcription;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('VideoMetadataPrompt', function () {
    test('builds prompt with video data', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'title' => 'Test Video',
            'description' => 'Test Description',
        ]);
        Transcription::factory()->for($video)->create([
            'content' => 'Video transcription content',
            'language' => 'pt',
        ]);

        $prompt = new VideoMetadataPrompt($video);
        $built = $prompt->build();

        expect($built)->toContain('Test Video')
            ->toContain('Test Description')
            ->toContain('Video transcription content')
            ->toContain('pt');
    });

    test('returns required keys', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        Transcription::factory()->for($video)->create();

        $prompt = new VideoMetadataPrompt($video);
        $keys = $prompt->requiredKeys();

        expect($keys)->toContain('key_points')
            ->toContain('chapters')
            ->toContain('reading_mode')
            ->toContain('suggested_tags')
            ->toContain('suggested_title')
            ->toContain('suggested_description');
    });

    test('parses response into VideoMetadataResult', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        Transcription::factory()->for($video)->create();

        $prompt = new VideoMetadataPrompt($video);
        $raw = [
            'key_points' => ['Point 1', 'Point 2'],
            'chapters' => [['timestamp' => '00:01:00', 'title' => 'Intro']],
            'reading_mode' => 'Summary text',
            'suggested_tags' => ['tag1', 'tag2'],
            'suggested_title' => 'New Title',
            'suggested_description' => 'New Description',
        ];

        $result = $prompt->parse($raw);

        expect($result)->toBeInstanceOf(VideoMetadataResult::class)
            ->and($result->keyPoints)->toBe(['Point 1', 'Point 2'])
            ->and($result->chapters)->toBe([['timestamp' => '00:01:00', 'title' => 'Intro']])
            ->and($result->readingMode)->toBe('Summary text')
            ->and($result->suggestedTags)->toBe(['tag1', 'tag2'])
            ->and($result->suggestedTitle)->toBe('New Title')
            ->and($result->suggestedDescription)->toBe('New Description');
    });
});

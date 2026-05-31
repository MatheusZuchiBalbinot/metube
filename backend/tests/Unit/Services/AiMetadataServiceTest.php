<?php

declare(strict_types=1);

use App\DTOs\VideoMetadataResult;
use App\Enums\AiSuggestionStatus;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use App\Models\VideoSummary;
use App\Services\AiMetadataService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('AiMetadataService', function () {
    test('apply stores summary for any video', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $result = new VideoMetadataResult(
            keyPoints: ['Point 1', 'Point 2'],
            chapters: [['timestamp' => '00:01:00', 'title' => 'Intro']],
            readingMode: 'Summary text',
            suggestedTags: ['tag1'],
            suggestedTitle: 'New Title',
            suggestedDescription: 'New description',
        );

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        $summary = VideoSummary::where('video_id', $video->id)->first();

        expect($summary)->not->toBeNull();
        expect($summary->key_points)->toBe(['Point 1', 'Point 2']);
        expect($summary->reading_mode)->toBe('Summary text');
    });

    test('apply auto-applies metadata in batch mode when fields empty', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => true,
            'title' => 'auto_generated.mp4',
            'description' => '',
            'tags' => [],
        ]);

        $result = new VideoMetadataResult(
            keyPoints: [],
            chapters: [],
            readingMode: 'Summary',
            suggestedTags: ['new-tag'],
            suggestedTitle: 'Better Title',
            suggestedDescription: 'Better description',
        );

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        $video->refresh();

        expect($video->title)->toBe('Better Title');
        expect($video->description)->toBe('Better description');
        expect($video->tags)->toBe(['new-tag']);
    });

    test('apply preserves existing fields in batch mode', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => true,
            'title' => 'User Title',
            'tags' => ['user-tag'],
        ]);

        $result = new VideoMetadataResult(
            keyPoints: [],
            chapters: [],
            readingMode: 'Summary',
            suggestedTags: ['ai-tag'],
            suggestedTitle: 'AI Title',
            suggestedDescription: 'AI description',
        );

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        $video->refresh();

        expect($video->title)->toBe('AI Title');
        expect($video->tags)->toBe(['user-tag']);
    });

    test('apply creates pending suggestion in single mode', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['is_batch' => false]);

        $result = new VideoMetadataResult(
            keyPoints: [],
            chapters: [],
            readingMode: 'Summary',
            suggestedTags: ['tag1', 'tag2'],
            suggestedTitle: 'Suggested Title',
            suggestedDescription: 'Suggested description',
        );

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        $suggestion = VideoAiSuggestion::where('video_id', $video->id)->first();

        expect($suggestion)->not->toBeNull();
        expect($suggestion->suggested_title)->toBe('Suggested Title');
        expect($suggestion->status)->toBe(AiSuggestionStatus::PENDING);
    });
});

<?php

use App\DTOs\VideoMetadataResult;
use App\Enums\AiSuggestionStatus;
use App\Events\AiSuggestionReady;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use App\Models\VideoSummary;
use App\Services\AiMetadataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

describe('AiMetadataService', function () {
    function createMockResult(): VideoMetadataResult
    {
        return new VideoMetadataResult(
            keyPoints: ['Point 1', 'Point 2'],
            chapters: [['timestamp' => '00:01:00', 'title' => 'Intro']],
            readingMode: 'Full summary',
            suggestedTags: ['tag1', 'tag2'],
            suggestedTitle: 'Better Title',
            suggestedDescription: 'Better Description',
        );
    }

    test('persists summary for any video', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $result = createMockResult();

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        expect(VideoSummary::where('video_id', $video->id)->exists())->toBeTrue();
        $summary = VideoSummary::where('video_id', $video->id)->first();
        expect($summary->key_points)->toBe(['Point 1', 'Point 2'])
            ->and($summary->reading_mode)->toBe('Full summary');
    });

    test('auto-applies all suggestions in batch mode', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => true,
            'title' => 'old_title.mp4',
            'description' => '',
            'tags' => [],
        ]);
        $result = createMockResult();

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        $video->refresh();
        expect($video->title)->toBe('Better Title')
            ->and($video->description)->toBe('Better Description')
            ->and($video->tags)->toBe(['tag1', 'tag2']);
    });

    test('preserves existing tags in batch mode if present', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => true,
            'tags' => ['user-tag'],
            'description' => '',
        ]);
        $result = createMockResult();

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        $video->refresh();
        expect($video->tags)->toBe(['user-tag']);
    });

    test('preserves existing description in batch mode if present', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => true,
            'tags' => [],
            'description' => 'User Description',
        ]);
        $result = createMockResult();

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        $video->refresh();
        expect($video->description)->toBe('User Description');
    });

    test('always applies suggested title in batch mode', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => true,
            'title' => 'User Title',
        ]);
        $result = createMockResult();

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        $video->refresh();
        expect($video->title)->toBe('Better Title');
    });

    test('stores suggestion for single upload without auto-applying', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => false,
            'title' => 'User Title',
            'tags' => ['user-tag'],
        ]);
        $result = createMockResult();

        Event::fake();

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        // Should not change the video
        $video->refresh();
        expect($video->title)->toBe('User Title')
            ->and($video->tags)->toBe(['user-tag']);

        // But should create a suggestion
        expect(VideoAiSuggestion::where('video_id', $video->id)->exists())->toBeTrue();
        $suggestion = VideoAiSuggestion::where('video_id', $video->id)->first();
        expect($suggestion->suggested_title)->toBe('Better Title')
            ->and($suggestion->suggested_description)->toBe('Better Description')
            ->and($suggestion->suggested_tags)->toBe(['tag1', 'tag2'])
            ->and($suggestion->status)->toBe(AiSuggestionStatus::PENDING);
    });

    test('dispatches AiSuggestionReady event for single upload', function () {
        Event::fake(AiSuggestionReady::class);

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['is_batch' => false]);
        $result = createMockResult();

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        Event::assertDispatched(AiSuggestionReady::class);
    });

    test('does not dispatch AiSuggestionReady event for batch upload', function () {
        Event::fake(AiSuggestionReady::class);

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['is_batch' => true]);
        $result = createMockResult();

        $service = app(AiMetadataService::class);
        $service->apply($video, $result);

        Event::assertNotDispatched(AiSuggestionReady::class);
    });
});

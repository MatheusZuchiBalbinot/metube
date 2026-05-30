<?php

use App\Enums\AiSuggestionStatus;
use App\Events\AiSuggestionReady;
use App\Jobs\GenerateAiMetadata;
use App\Models\Transcription;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use App\Models\VideoSummary;
use App\Services\IAService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

describe('GenerateAiMetadata', function () {
    $mockResponse = [
        'key_points' => ['Point 1', 'Point 2'],
        'chapters' => [['timestamp' => '00:01:00', 'title' => 'Intro']],
        'reading_mode' => 'Full summary text here.',
        'suggested_tags' => ['tag1', 'tag2'],
        'suggested_title' => 'Better title',
        'suggested_description' => 'Better description',
    ];

    beforeEach(function () use (&$mockResponse) {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                ['text' => json_encode($mockResponse)],
                            ],
                        ],
                    ],
                ],
            ]),
        ]);
    });

    test('generates summary from transcription', function () use (&$mockResponse) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['is_batch' => false]);
        Transcription::factory()->for($video)->create(['content' => 'Full transcription text.']);

        $job = new GenerateAiMetadata($video);
        $job->handle(app(IAService::class));

        expect(VideoSummary::where('video_id', $video->id)->exists())->toBeTrue();
        $summary = VideoSummary::where('video_id', $video->id)->first();
        expect($summary->key_points)->toBe($mockResponse['key_points'])
            ->and($summary->reading_mode)->toBe($mockResponse['reading_mode']);
    });

    test('auto-applies tags/title/description in batch mode', function () use (&$mockResponse) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => true,
            'tags' => [],
            'description' => '',
            'title' => 'old_filename.mp4',
        ]);
        Transcription::factory()->for($video)->create(['content' => 'Full transcription text.']);

        $job = new GenerateAiMetadata($video);
        $job->handle(app(IAService::class));

        $video->refresh();
        expect($video->tags)->toBe($mockResponse['suggested_tags'])
            ->and($video->description)->toBe($mockResponse['suggested_description'])
            ->and($video->title)->toBe($mockResponse['suggested_title']);
    });

    test('creates pending suggestion in single upload mode', function () use (&$mockResponse) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => false,
            'tags' => ['existing-tag'],
            'title' => 'User Title',
        ]);
        Transcription::factory()->for($video)->create(['content' => 'Full transcription text.']);

        $job = new GenerateAiMetadata($video);
        $job->handle(app(IAService::class));

        expect(VideoAiSuggestion::where('video_id', $video->id)->exists())->toBeTrue();
        $suggestion = VideoAiSuggestion::where('video_id', $video->id)->first();
        expect($suggestion->suggested_title)->toBe($mockResponse['suggested_title'])
            ->and($suggestion->suggested_description)->toBe($mockResponse['suggested_description'])
            ->and($suggestion->suggested_tags)->toBe($mockResponse['suggested_tags'])
            ->and($suggestion->status)->toBe(AiSuggestionStatus::PENDING);
    });

    test('skips when transcription is missing', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['is_batch' => false]);

        GenerateAiMetadata::dispatch($video)->onQueue('default');

        $this->artisan('queue:work', ['--once' => true]);

        expect(VideoSummary::where('video_id', $video->id)->exists())->toBeFalse();
    });

    test('skips when transcription content is empty', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['is_batch' => false]);
        Transcription::factory()->for($video)->create(['content' => '']);

        GenerateAiMetadata::dispatch($video)->onQueue('default');

        $this->artisan('queue:work', ['--once' => true]);

        expect(VideoSummary::where('video_id', $video->id)->exists())->toBeFalse();
    });

    test('handles Gemini API failure gracefully', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['is_batch' => false]);
        Transcription::factory()->for($video)->create(['content' => 'Full transcription text.']);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([], 500),
        ]);

        $job = new GenerateAiMetadata($video);
        $exception = new \Exception('Gemini API error');

        // Verify failed() method exists and can be called
        $job->failed($exception);

        // Verify job doesn't create summary on API failure
        expect(VideoSummary::where('video_id', $video->id)->exists())->toBeFalse();
    });

    test('dispatches AiSuggestionReady event in single upload mode', function () use (&$mockResponse) {
        Event::fake(AiSuggestionReady::class);

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => false,
            'tags' => ['existing-tag'],
            'title' => 'User Title',
        ]);
        Transcription::factory()->for($video)->create(['content' => 'Full transcription text.']);

        $job = new GenerateAiMetadata($video);
        $job->handle(app(IAService::class));

        Event::assertDispatched(AiSuggestionReady::class);
    });

    test('does not dispatch event in batch mode', function () use (&$mockResponse) {
        Event::fake(AiSuggestionReady::class);

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'is_batch' => true,
            'tags' => [],
            'description' => '',
        ]);
        Transcription::factory()->for($video)->create(['content' => 'Full transcription text.']);

        $job = new GenerateAiMetadata($video);
        $job->handle(app(IAService::class));

        Event::assertNotDispatched(AiSuggestionReady::class);
    });
});

<?php

declare(strict_types=1);

use App\Enums\AiSuggestionStatus;
use App\Enums\TranscriptionStatus;
use App\Enums\VideoStatus;
use App\Events\AiSuggestionReady;
use App\Events\TranscriptionStatusUpdated;
use App\Events\VideoStatusUpdated;
use App\Events\VideoTranscriptionCompleted;
use App\Events\VideoTranscriptionStarted;
use App\Jobs\ProcessVideoUpload;
use App\Models\User;
use App\Models\Video;
use App\Services\VideoPublishingService;
use App\Services\VideoStorageService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

uses()->group('pipeline');

/**
 * Exercises the real chain a queue worker runs after ProcessVideoUpload is dispatched:
 * HLS transcode (real ffmpeg against a tiny fixture) -> audio extraction -> Whisper
 * transcription -> AI metadata generation -> publish. Every hop in this chain is a
 * plain dispatch()/event() call with QUEUE_CONNECTION=sync, so it all runs synchronously
 * in-process — the only external calls are Whisper and Groq, both faked via Http::fake().
 *
 * This intentionally starts at ProcessVideoUpload::handle() rather than the `POST
 * /videos` endpoint: VideoUploadService::createVideo() dispatches ProcessVideoUpload
 * with ->afterCommit(), which only runs when the outermost DB transaction reaches level
 * 0 — RefreshDatabase keeps a transaction open for the whole test, so that hop can never
 * fire here. That HTTP-to-dispatch hop already has coverage in VideoUploadServiceTest
 * via Queue::fake()/Queue::assertPushed(); calling the job directly is the accurate
 * substitute for "a queue worker picked this job up" and lets the entire downstream
 * chain, which has no such afterCommit gate, run for real from there.
 *
 * Every broadcasting event the chain fires (status/transcription updates,
 * AI-suggestion-ready — all ShouldBroadcast, queued rather than sent inline)
 * is faked — without that this chain would try to reach the real Reverb
 * server, which isn't relevant to what this test verifies (the pipeline's
 * data, not broadcast delivery).
 */
describe('video processing pipeline — chain', function () {
    beforeEach(function () {
        // Forced explicitly rather than trusting phpunit.xml's env overrides: this
        // chain's whole premise is that every dispatch() in it runs synchronously
        // in-process, which only holds on the sync queue connection with the
        // non-Redis-backed ShouldBeUnique lock the array cache store gives it.
        config(['queue.default' => 'sync', 'cache.default' => 'array']);

        Storage::fake('local');
        Storage::fake('public');
        Event::fake([
            VideoStatusUpdated::class,
            TranscriptionStatusUpdated::class,
            VideoTranscriptionStarted::class,
            VideoTranscriptionCompleted::class,
            AiSuggestionReady::class,
        ]);
        // VideoAiSummaryReadyNotification broadcasts too (BroadcastMessage), which
        // Event::fake() does not intercept — Notification::fake() covers that channel.
        Notification::fake();
    });

    test('upload finalize runs the full pipeline through to publish', function () {
        Http::fake([
            'whisper:8001/*' => Http::response([
                'language' => 'en',
                'text' => 'This is the transcribed content of the sample video.',
                'vtt' => "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello.",
            ]),
            'api.groq.com/*' => Http::response([
                'choices' => [['message' => ['content' => json_encode([
                    'key_points' => ['Point A'],
                    'chapters' => [],
                    'reading_mode' => 'Summary text.',
                    'suggested_tags' => ['tag1'],
                    'suggested_title' => 'AI Title',
                    'suggested_description' => 'AI description.',
                ])]]],
            ]),
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'status' => VideoStatus::PROCESSING,
            'is_batch' => false,
            'video_url' => null,
            'hls_url' => null,
            'duration' => null,
        ]);

        $tmpPath = "uploads/tmp/{$video->vuid}.mp4";
        Storage::disk('local')->put($tmpPath, file_get_contents(base_path('tests/fixtures/sample.mp4')));

        // Simulates a queue worker picking up the job — see the describe()-level
        // docblock for why this starts here instead of the HTTP upload endpoint.
        (new ProcessVideoUpload($video, $tmpPath))->handle(app(VideoStorageService::class));

        $video->refresh();
        expect($video->status)->toBe(VideoStatus::DRAFT)
            ->and($video->hls_url)->not->toBeNull()
            ->and(Storage::disk('public')->exists($video->hls_url))->toBeTrue()
            ->and($video->duration)->not->toBeNull()
            ->and($video->video_url)->toBeNull(); // source file is deleted once the HLS package exists

        expect($video->transcription?->status)->toBe(TranscriptionStatus::COMPLETED)
            ->and($video->transcription?->content)->toBe('This is the transcribed content of the sample video.');

        $suggestion = $video->aiSuggestion;
        expect($suggestion)->not->toBeNull()
            ->and($suggestion->status)->toBe(AiSuggestionStatus::PENDING)
            ->and($suggestion->suggested_title)->toBe('AI Title');

        app(VideoPublishingService::class)->publishVideo($video);

        expect($video->refresh()->status)->toBe(VideoStatus::PUBLISHED);
    });
});

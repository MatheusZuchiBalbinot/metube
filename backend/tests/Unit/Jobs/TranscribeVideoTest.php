<?php

use App\Enums\TranscriptionStatus;
use App\Events\TranscriptionStatusUpdated;
use App\Jobs\TranscribeVideo;
use App\Jobs\TranslateVideoCaptions;
use App\Models\Transcription;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

$vttFixture = "WEBVTT\n\n1\n00:00:00.000 --> 00:00:03.000\nHello world\n";

describe('TranscribeVideo', function () use ($vttFixture) {
    describe('handle — happy path', function () use ($vttFixture) {
        beforeEach(function () {
            Queue::fake();
            Storage::fake('public');
        });

        test('creates a completed transcription when whisper responds successfully', function () use ($vttFixture) {
            $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4']);

            Http::fake([
                'whisper:8001/transcribe' => Http::response([
                    'text' => 'Hello world',
                    'language' => 'en',
                    'vtt' => $vttFixture,
                ], 200),
            ]);

            app()->call([new TranscribeVideo($video), 'handle']);

            $transcription = Transcription::where('video_id', $video->id)->first();
            expect($transcription)->not->toBeNull()
                ->and($transcription->status)->toBe(TranscriptionStatus::COMPLETED)
                ->and($transcription->content)->toBe('Hello world')
                ->and($transcription->language)->toBe('en');
        });

        test('saves a vtt caption file and updates video captions for detected language', function () use ($vttFixture) {
            $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4', 'vuid' => 'testvuid123']);

            Http::fake([
                'whisper:8001/transcribe' => Http::response([
                    'text' => 'Hello world',
                    'language' => 'en',
                    'vtt' => $vttFixture,
                ], 200),
            ]);

            app()->call([new TranscribeVideo($video), 'handle']);

            Storage::disk('public')->assertExists("captions/{$video->vuid}.en.vtt");

            $video->refresh();
            expect($video->captions)->toHaveCount(1)
                ->and($video->captions[0]['lang'])->toBe('en')
                ->and($video->captions[0]['label'])->toBe('English');
        });

        test('dispatches async english translation when source language is not english', function () use ($vttFixture) {
            $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4']);

            Http::fake([
                'whisper:8001/transcribe' => Http::response(['text' => 'Olá mundo', 'language' => 'pt', 'vtt' => $vttFixture], 200),
            ]);

            app()->call([new TranscribeVideo($video), 'handle']);

            Http::assertSentCount(1);
            Queue::assertPushed(TranslateVideoCaptions::class);

            $video->refresh();
            expect($video->captions)->toHaveCount(1)
                ->and($video->captions[0]['lang'])->toBe('pt');
        });

        test('does not dispatch translation when source is already english', function () use ($vttFixture) {
            $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4']);

            Http::fake([
                'whisper:8001/transcribe' => Http::response([
                    'text' => 'Hello world',
                    'language' => 'en',
                    'vtt' => $vttFixture,
                ], 200),
            ]);

            app()->call([new TranscribeVideo($video), 'handle']);

            Http::assertSentCount(1);
            Queue::assertNotPushed(TranslateVideoCaptions::class);

            $video->refresh();
            expect($video->captions)->toHaveCount(1)
                ->and($video->captions[0]['lang'])->toBe('en');
        });

        test('sets started_at on the transcription before calling whisper', function () use ($vttFixture) {
            $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4', 'duration' => 120.0]);

            Http::fake([
                'whisper:8001/transcribe' => Http::response(['text' => 'ok', 'language' => 'en', 'vtt' => $vttFixture], 200),
            ]);

            app()->call([new TranscribeVideo($video), 'handle']);

            $transcription = Transcription::where('video_id', $video->id)->first();
            expect($transcription->started_at)->not->toBeNull();
        });

        test('fires TranscriptionStatusUpdated with PROCESSING and ETA before calling whisper', function () use ($vttFixture) {
            Event::fake([TranscriptionStatusUpdated::class]);

            $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4', 'duration' => 100.0]);

            Http::fake([
                'whisper:8001/transcribe' => Http::response(['text' => 'ok', 'language' => 'en', 'vtt' => $vttFixture], 200),
            ]);

            app()->call([new TranscribeVideo($video), 'handle']);

            Event::assertDispatched(TranscriptionStatusUpdated::class, function (TranscriptionStatusUpdated $e) {
                return $e->status === TranscriptionStatus::PROCESSING
                    && $e->startedAt !== null
                    && $e->estimatedSeconds !== null;
            });
        });

        test('updates an existing transcription record instead of creating a new one', function () use ($vttFixture) {
            $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4']);
            Transcription::create([
                'video_id' => $video->id,
                'status' => TranscriptionStatus::FAILED,
            ]);

            Http::fake([
                'whisper:8001/transcribe' => Http::sequence()
                    ->push(['text' => 'Retry worked', 'language' => 'pt', 'vtt' => $vttFixture], 200)
                    ->push(['text' => 'Retry worked', 'language' => 'en', 'vtt' => $vttFixture], 200),
            ]);

            app()->call([new TranscribeVideo($video), 'handle']);

            expect(Transcription::where('video_id', $video->id)->count())->toBe(1)
                ->and(Transcription::where('video_id', $video->id)->first()->status)->toBe(TranscriptionStatus::COMPLETED);
        });
    });

    describe('handle — failure path', function () {
        test('marks transcription as failed when whisper returns an error', function () {
            Storage::fake('public');
            $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4']);

            Http::fake([
                'whisper:8001/transcribe' => Http::response(['detail' => 'File not found'], 404),
            ]);

            expect(fn () => app()->call([new TranscribeVideo($video), 'handle']))
                ->toThrow(RuntimeException::class);

            $transcription = Transcription::where('video_id', $video->id)->first();
            expect($transcription->status)->toBe(TranscriptionStatus::FAILED);
        });

    });

    describe('handle — early exit', function () {
        test('skips transcription when the video no longer exists', function () {
            $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4']);
            $video->delete();

            Http::fake();

            app()->call([new TranscribeVideo($video), 'handle']);

            Http::assertNothingSent();
        });

        test('skips transcription when video_url is null', function () {
            $video = Video::factory()->processing()->create(['video_url' => null]);

            Http::fake();

            app()->call([new TranscribeVideo($video), 'handle']);

            Http::assertNothingSent();
        });

        test('skips transcription when transcription is already COMPLETED', function () {
            $video = Video::factory()->draft()->create(['video_url' => 'videos/abc.mp4']);
            \App\Models\Transcription::create([
                'video_id' => $video->id,
                'status' => \App\Enums\TranscriptionStatus::COMPLETED,
                'content' => 'Already done.',
                'language' => 'en',
            ]);

            Http::fake();

            app()->call([new TranscribeVideo($video), 'handle']);

            Http::assertNothingSent();
        });
    });

    describe('failed', function () {
        test('marks transcription as failed on permanent failure', function () {
            $video = Video::factory()->published()->create();
            Transcription::create([
                'video_id' => $video->id,
                'status' => TranscriptionStatus::PROCESSING,
            ]);

            (new TranscribeVideo($video))->failed(new RuntimeException('timeout'));

            expect(Transcription::where('video_id', $video->id)->first()->status)
                ->toBe(TranscriptionStatus::FAILED);
        });

        test('does nothing when the video no longer exists', function () {
            $video = Video::factory()->published()->create();
            $video->delete();

            // should not throw
            (new TranscribeVideo($video))->failed(new RuntimeException);

            expect(Transcription::count())->toBe(0);
        });
    });
});

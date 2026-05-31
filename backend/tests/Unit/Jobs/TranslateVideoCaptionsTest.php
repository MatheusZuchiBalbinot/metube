<?php

use App\Jobs\TranslateVideoCaptions;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

$vttFixture = "WEBVTT\n\n1\n00:00:00.000 --> 00:00:03.000\nHello world\n";

describe('TranslateVideoCaptions', function () use ($vttFixture) {
    beforeEach(fn () => Storage::fake('public'));

    test('appends an english caption track to the existing captions', function () use ($vttFixture) {
        $video = Video::factory()->published()->create([
            'video_url' => 'videos/abc.mp4',
            'captions' => [
                ['lang' => 'pt', 'label' => 'Português', 'url' => 'captions/abc.pt.vtt'],
            ],
        ]);

        Http::fake([
            'whisper:8001/transcribe' => Http::response(['text' => 'Hello world', 'language' => 'en', 'vtt' => $vttFixture], 200),
        ]);

        app()->call([new TranslateVideoCaptions($video), 'handle']);

        Storage::disk('public')->assertExists("captions/{$video->vuid}.en.vtt");

        $video->refresh();
        $langs = collect($video->captions)->pluck('lang')->toArray();
        expect($langs)->toContain('pt')->toContain('en')
            ->and($video->captions)->toHaveCount(2);
    });

    test('sends the request with the translate task', function () use ($vttFixture) {
        $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4', 'captions' => []]);

        Http::fake([
            'whisper:8001/transcribe' => Http::response(['text' => 'Hello', 'language' => 'en', 'vtt' => $vttFixture], 200),
        ]);

        app()->call([new TranslateVideoCaptions($video), 'handle']);

        Http::assertSent(fn ($request) => $request['task'] === 'translate');
    });

    test('leaves captions untouched when whisper translation fails', function () {
        $video = Video::factory()->published()->create([
            'video_url' => 'videos/abc.mp4',
            'captions' => [
                ['lang' => 'pt', 'label' => 'Português', 'url' => 'captions/abc.pt.vtt'],
            ],
        ]);

        Http::fake([
            'whisper:8001/transcribe' => Http::response(['detail' => 'error'], 500),
        ]);

        app()->call([new TranslateVideoCaptions($video), 'handle']);

        $video->refresh();
        expect($video->captions)->toHaveCount(1)
            ->and($video->captions[0]['lang'])->toBe('pt');
    });

    test('is idempotent — skips when english caption already exists', function () {
        $video = Video::factory()->published()->create([
            'video_url' => 'videos/abc.mp4',
            'captions' => [
                ['lang' => 'pt', 'label' => 'Português', 'url' => 'captions/abc.pt.vtt'],
                ['lang' => 'en', 'label' => 'English', 'url' => 'captions/abc.en.vtt'],
            ],
        ]);

        Http::fake();

        app()->call([new TranslateVideoCaptions($video), 'handle']);

        Http::assertNothingSent();

        $video->refresh();
        expect($video->captions)->toHaveCount(2);
    });

    test('skips when the video no longer exists', function () {
        $video = Video::factory()->published()->create(['video_url' => 'videos/abc.mp4']);
        $video->delete();

        Http::fake();

        app()->call([new TranslateVideoCaptions($video), 'handle']);

        Http::assertNothingSent();
    });

    test('skips when video_url is null', function () {
        $video = Video::factory()->processing()->create(['video_url' => null]);

        Http::fake();

        app()->call([new TranslateVideoCaptions($video), 'handle']);

        Http::assertNothingSent();
    });
});

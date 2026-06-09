<?php

declare(strict_types=1);

use App\Http\Resources\VideoResource;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

describe('VideoResource', function () {
    test('toArray includes expected keys', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array)->toHaveKeys([
            'vuid', 'title', 'description', 'status', 'views', 'duration',
            'video_url', 'hls_url', 'thumbnail_url', 'published_at', 'scheduled_at',
            'created_at', 'tags', 'captions',
        ]);
    });

    test('vuid matches the video vuid', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['vuid'])->toBe($video->vuid);
    });

    test('status is the string value of the enum', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['status' => 'published']);

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['status'])->toBe('published');
    });

    test('description falls back to empty string when null', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['description' => null]);

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['description'])->toBe('');
    });

    test('video_url is null when video_url field is null', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['video_url' => null]);

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['video_url'])->toBeNull();
    });

    test('video_url is resolved via Storage when set', function () {
        Storage::fake('public');
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['video_url' => 'videos/test.mp4']);

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['video_url'])->toContain('test.mp4');
    });

    test('video_url keeps an absolute URL untouched (externally-hosted media)', function () {
        $external = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4';
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['video_url' => $external]);

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['video_url'])->toBe($external);
    });

    test('hls_url is null when hls_url field is null', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['hls_url' => null]);

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['hls_url'])->toBeNull();
    });

    test('hls_url is resolved via Storage when set', function () {
        Storage::fake('public');
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['hls_url' => 'hls/abc/master.m3u8']);

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['hls_url'])->toContain('hls/abc/master.m3u8');
    });

    test('created_at is ISO 8601 string', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['created_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
    });

    test('channel and channel_id are empty string when relation not loaded', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['channel'])->toBe('');
        expect($array['channel_id'])->toBe('');
    });

    test('channel and channel_id come from loaded relation', function () {
        $user = User::factory()->create(['name' => 'Creator']);
        $video = Video::factory()->for($user, 'channel')->create();
        $video->load('channel');

        $array = (new VideoResource($video))->toArray(new Request());

        expect($array['channel'])->toBe('Creator');
        expect($array['channel_id'])->toBe($user->uuid);
    });
});

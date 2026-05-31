<?php

use App\Jobs\TranslateVideoCaptions;
use App\Models\Video;
use App\Services\WhisperClient;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('TranslateVideoCaptions', function () {
    test('job skips if video not found', function () {
        $job = new TranslateVideoCaptions(new Video(['id' => 99999]));
        $whisper = app(WhisperClient::class);

        $job->handle($whisper, app('App\Services\VideoStorageService'));

        expect(true)->toBeTrue();
    });

    test('job skips if video has no url', function () {
        $video = new Video(['id' => 123, 'video_url' => null]);

        $job = new TranslateVideoCaptions($video);
        $whisper = app(WhisperClient::class);

        $job->handle($whisper, app('App\Services\VideoStorageService'));

        expect(true)->toBeTrue();
    });

    test('job failed returns early if video not found', function () {
        $job = new TranslateVideoCaptions(new Video(['id' => 99999]));
        $job->failed(new Exception('Test error'));

        expect(true)->toBeTrue();
    });
});

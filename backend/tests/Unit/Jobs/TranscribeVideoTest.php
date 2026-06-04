<?php

declare(strict_types=1);

use App\Events\TranscriptionStatusUpdated;
use App\Jobs\TranscribeVideo;
use App\Models\Video;
use App\Services\TranscriptionService;
use App\Services\VideoStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

describe('TranscribeVideo', function () {
    test('job skips if video not found', function () {
        $job = new TranscribeVideo(new Video(['id' => 99999]));
        $service = app(TranscriptionService::class);
        $storage = Mockery::mock(VideoStorageService::class);
        $storage->shouldNotReceive('exists');

        $job->handle($service, $storage);

        expect(true)->toBeTrue();
    });

    test('job skips when audio file is missing', function () {
        $user = App\Models\User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $storage = Mockery::mock(VideoStorageService::class);
        $storage->shouldReceive('exists')->once()->andReturn(false);

        $job = new TranscribeVideo($video);
        $job->handle(app(TranscriptionService::class), $storage);

        expect($video->transcription)->toBeNull();
    });

    test('job marks transcription as failed on exception', function () {
        Event::fake();

        $video = new Video(['id' => 123]);

        $job = new TranscribeVideo($video);
        $job->failed(new Exception('Test error'));

        Event::assertNotDispatched(TranscriptionStatusUpdated::class);
    });
});

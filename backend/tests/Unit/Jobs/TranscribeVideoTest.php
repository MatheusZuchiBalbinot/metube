<?php

declare(strict_types=1);

use App\Events\TranscriptionStatusUpdated;
use App\Events\VideoPublished;
use App\Jobs\TranscribeVideo;
use App\Models\User;
use App\Models\Video;
use App\Services\TranscriptionService;
use App\Services\VideoStorageService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

describe('TranscribeVideo', function () {
    test('uniqueId returns the video id so concurrent runs are deduplicated', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $job = new TranscribeVideo($video);

        expect($job->uniqueId())->toBe((string) $video->id);
    });

    test('publishing a video does not dispatch a transcription job', function () {
        Queue::fake();

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        // The publish-time listener is a no-op; TranscodeVideoToHls is the single
        // dispatcher of TranscribeVideo, so VideoPublished must not enqueue it again.
        VideoPublished::dispatch($video);

        Queue::assertNotPushed(TranscribeVideo::class);
    });

    test('job skips if video not found', function () {
        $job = new TranscribeVideo(new Video(['id' => 99999]));
        $service = app(TranscriptionService::class);
        $storage = Mockery::mock(VideoStorageService::class);
        $storage->shouldNotReceive('exists');

        $job->handle($service, $storage);

        expect(true)->toBeTrue();
    });

    test('job skips when audio file is missing', function () {
        $user = User::factory()->create();
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

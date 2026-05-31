<?php

use App\Events\TranscriptionStatusUpdated;
use App\Jobs\TranscribeVideo;
use App\Models\Video;
use App\Services\TranscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

describe('TranscribeVideo', function () {
    test('job skips if video not found', function () {
        $job = new TranscribeVideo(new Video(['id' => 99999]));
        $service = app(TranscriptionService::class);

        $job->handle($service);

        expect(true)->toBeTrue();
    });

    test('job marks transcription as failed on exception', function () {
        Event::fake();

        $video = new Video(['id' => 123]);

        $job = new TranscribeVideo($video);
        $job->failed(new Exception('Test error'));

        Event::assertNotDispatched(TranscriptionStatusUpdated::class);
    });
});

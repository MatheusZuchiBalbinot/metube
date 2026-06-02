<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Jobs\TranscodeVideoToHls;
use App\Jobs\TranscribeVideo;
use App\Models\User;
use App\Models\Video;
use App\Services\HlsTranscodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

/**
 * Create a draft video with a source file present on the faked public disk.
 */
function makeSourceVideo(bool $isBatch = false): Video
{
    $user = User::factory()->create();
    $video = Video::factory()->for($user, 'channel')->draft()->create([
        'is_batch' => $isBatch,
        'video_url' => 'videos/source.mp4',
        'duration' => null,
        'hls_url' => null,
    ]);
    Storage::disk('public')->put('videos/source.mp4', 'raw-bytes');

    return $video;
}

describe('TranscodeVideoToHls', function () {
    beforeEach(function () {
        Queue::fake();
        Storage::fake('public');
    });

    describe('handle — single upload', function () {
        test('builds HLS, extracts audio, drops the source and dispatches transcription', function () {
            $video = makeSourceVideo(isBatch: false);

            $hls = Mockery::mock(HlsTranscodeService::class);
            $hls->shouldReceive('probeDuration')->once()->andReturn(123.5);
            $hls->shouldReceive('transcode')->once()
                ->with(Mockery::any(), $video->vuid)
                ->andReturn("hls/{$video->vuid}/master.m3u8");
            $hls->shouldReceive('extractAudio')->once()
                ->with(Mockery::any(), $video->vuid)
                ->andReturn($video->audioPath());

            (new TranscodeVideoToHls($video))->handle($hls);

            $video->refresh();
            expect($video->hls_url)->toBe("hls/{$video->vuid}/master.m3u8")
                ->and($video->duration)->toBe(123.5)
                ->and($video->video_url)->toBeNull();

            Storage::disk('public')->assertMissing('videos/source.mp4');
            Queue::assertPushed(TranscribeVideo::class);
        });
    });

    describe('handle — batch upload', function () {
        test('builds HLS without extracting audio or dispatching transcription', function () {
            $video = makeSourceVideo(isBatch: true);

            $hls = Mockery::mock(HlsTranscodeService::class);
            $hls->shouldReceive('probeDuration')->once()->andReturn(60.0);
            $hls->shouldReceive('transcode')->once()->andReturn("hls/{$video->vuid}/master.m3u8");
            $hls->shouldNotReceive('extractAudio');

            (new TranscodeVideoToHls($video))->handle($hls);

            expect($video->refresh()->hls_url)->toBe("hls/{$video->vuid}/master.m3u8");
            Queue::assertNotPushed(TranscribeVideo::class);
        });
    });

    describe('handle — nothing to do', function () {
        test('returns early when the video no longer exists', function () {
            $hls = Mockery::mock(HlsTranscodeService::class);
            $hls->shouldNotReceive('transcode');

            (new TranscodeVideoToHls(new Video(['id' => 99999])))->handle($hls);

            Queue::assertNotPushed(TranscribeVideo::class);
        });

        test('returns early when the source file was already removed', function () {
            $video = makeSourceVideo();
            $video->update(['video_url' => null]);

            $hls = Mockery::mock(HlsTranscodeService::class);
            $hls->shouldNotReceive('transcode');

            (new TranscodeVideoToHls($video))->handle($hls);

            Queue::assertNotPushed(TranscribeVideo::class);
        });
    });

    describe('failed', function () {
        test('marks the video as FAILED', function () {
            $video = makeSourceVideo();

            (new TranscodeVideoToHls($video))->failed(new RuntimeException('ffmpeg crashed'));

            expect($video->fresh()->status)->toBe(VideoStatus::FAILED);
        });
    });
});

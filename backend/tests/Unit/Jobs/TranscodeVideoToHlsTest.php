<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Jobs\TranscodeVideoToHls;
use App\Jobs\TranscribeVideo;
use App\Models\User;
use App\Models\Video;
use App\Services\HlsTranscodeService;
use App\Services\VideoStorageService;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

/**
 * Create a draft video with a source file present on the faked public disk.
 */
function makeSourceVideo(bool $isBatch = false, ?string $thumbnailUrl = null): Video
{
    $user = User::factory()->create();
    $video = Video::factory()->for($user, 'channel')->draft()->create([
        'is_batch' => $isBatch,
        'video_url' => 'videos/source.mp4',
        'thumbnail_url' => $thumbnailUrl,
        'duration' => null,
        'hls_url' => null,
    ]);
    Storage::disk('public')->put('videos/source.mp4', 'raw-bytes');

    return $video;
}

/**
 * Build a VideoStorageService mock that handles the common disk operations.
 *
 * @return Mockery\MockInterface&VideoStorageService
 */
function makeStorageMock(string $sourceAbsPath = '/abs/videos/source.mp4'): Mockery\MockInterface
{
    $storage = Mockery::mock(VideoStorageService::class);
    $storage->shouldReceive('exists')
        ->once()
        ->andReturn(false);
    $storage->shouldReceive('absolutePublicPath')
        ->with('videos/source.mp4')
        ->andReturn($sourceAbsPath);
    $storage->shouldReceive('deletePublished')
        ->with('videos/source.mp4')
        ->once();

    return $storage;
}

describe('TranscodeVideoToHls', function () {
    beforeEach(function () {
        Queue::fake();
        Storage::fake('public');
    });

    test('uniqueId returns the video id so concurrent runs are deduplicated', function () {
        $video = makeSourceVideo();

        expect((new TranscodeVideoToHls($video))->uniqueId())->toBe((string) $video->id);
    });

    describe('handle — single upload without thumbnail', function () {
        test('builds HLS, extracts audio, auto-generates thumbnail and dispatches transcription', function () {
            $video = makeSourceVideo(isBatch: false, thumbnailUrl: null);
            $storage = makeStorageMock();
            $storage->shouldReceive('publishThumbnailFromAbsPath')
                ->once()
                ->with('/tmp/thumb.jpg', $video->vuid)
                ->andReturn("thumbnails/{$video->vuid}.webp");

            $hls = Mockery::mock(HlsTranscodeService::class);
            $hls->shouldReceive('probeDuration')->once()->andReturn(123.5);
            $hls->shouldReceive('transcode')->once()
                ->with(Mockery::any(), $video->vuid)
                ->andReturn("hls/{$video->vuid}/master.m3u8");
            $hls->shouldReceive('extractAudio')->once()
                ->with(Mockery::any(), $video->vuid)
                ->andReturn($video->audioPath());
            $hls->shouldReceive('extractThumbnail')->once()
                ->with(Mockery::any(), $video->vuid, 123.5)
                ->andReturn('/tmp/thumb.jpg');

            (new TranscodeVideoToHls($video))->handle($hls, $storage);

            $video->refresh();
            expect($video->hls_url)->toBe("hls/{$video->vuid}/master.m3u8")
                ->and($video->duration)->toBe(123.5)
                ->and($video->thumbnail_url)->toBe("thumbnails/{$video->vuid}.webp")
                ->and($video->video_url)->toBeNull();

            Queue::assertPushed(TranscribeVideo::class);
        });
    });

    describe('handle — single upload with existing thumbnail', function () {
        test('builds HLS and extracts audio without overwriting the existing thumbnail', function () {
            $video = makeSourceVideo(isBatch: false, thumbnailUrl: 'thumbnails/existing.webp');
            $storage = makeStorageMock();
            $storage->shouldNotReceive('publishThumbnailFromAbsPath');

            $hls = Mockery::mock(HlsTranscodeService::class);
            $hls->shouldReceive('probeDuration')->once()->andReturn(60.0);
            $hls->shouldReceive('transcode')->once()->andReturn("hls/{$video->vuid}/master.m3u8");
            $hls->shouldReceive('extractAudio')->once();
            $hls->shouldNotReceive('extractThumbnail');

            (new TranscodeVideoToHls($video))->handle($hls, $storage);

            expect($video->refresh()->thumbnail_url)->toBe('thumbnails/existing.webp');
            Queue::assertPushed(TranscribeVideo::class);
        });
    });

    describe('handle — upload without thumbnail', function () {
        test('builds HLS, auto-generates the thumbnail, extracts audio and dispatches transcription', function () {
            $video = makeSourceVideo(isBatch: true, thumbnailUrl: null);
            $storage = makeStorageMock();
            $storage->shouldReceive('publishThumbnailFromAbsPath')
                ->once()
                ->with('/tmp/thumb.jpg', $video->vuid)
                ->andReturn("thumbnails/{$video->vuid}.webp");

            $hls = Mockery::mock(HlsTranscodeService::class);
            $hls->shouldReceive('probeDuration')->once()->andReturn(60.0);
            $hls->shouldReceive('transcode')->once()->andReturn("hls/{$video->vuid}/master.m3u8");
            $hls->shouldReceive('extractAudio')->once();
            $hls->shouldReceive('extractThumbnail')->once()
                ->with(Mockery::any(), $video->vuid, 60.0)
                ->andReturn('/tmp/thumb.jpg');

            (new TranscodeVideoToHls($video))->handle($hls, $storage);

            expect($video->refresh()->hls_url)->toBe("hls/{$video->vuid}/master.m3u8");
            Queue::assertPushed(TranscribeVideo::class);
        });
    });

    describe('handle — nothing to do', function () {
        test('returns early when the video no longer exists', function () {
            $hls = Mockery::mock(HlsTranscodeService::class);
            $hls->shouldNotReceive('transcode');

            $storage = Mockery::mock(VideoStorageService::class);
            $storage->shouldNotReceive('absolutePublicPath');

            (new TranscodeVideoToHls(new Video(['id' => 99999])))->handle($hls, $storage);

            Queue::assertNotPushed(TranscribeVideo::class);
        });

        test('returns early when the source file was already removed', function () {
            $video = makeSourceVideo();
            $video->update(['video_url' => null]);

            $hls = Mockery::mock(HlsTranscodeService::class);
            $hls->shouldNotReceive('transcode');

            $storage = Mockery::mock(VideoStorageService::class);
            $storage->shouldReceive('exists')->once()->andReturn(false);
            $storage->shouldNotReceive('absolutePublicPath');

            (new TranscodeVideoToHls($video))->handle($hls, $storage);

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

<?php

use App\Enums\VideoStatus;
use App\Jobs\ProcessVideoUpload;
use App\Models\Video;
use App\Services\VideoStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

/**
 * Return a mock VideoStorageService that stubs all methods with sensible defaults.
 *
 * @param  string  $videoUrl  URL returned by publishVideo
 * @param  string|null  $thumbnailUrl  URL returned by publishThumbnail
 */
function mockStorage(string $videoUrl = '/storage/videos/test.mp4', ?string $thumbnailUrl = '/storage/thumbnails/test.webp'): VideoStorageService
{
    $mock = Mockery::mock(VideoStorageService::class);
    $mock->shouldReceive('publishVideo')->andReturn($videoUrl)->byDefault();
    $mock->shouldReceive('publishThumbnail')->andReturn($thumbnailUrl)->byDefault();
    $mock->shouldReceive('cleanupTmp')->byDefault();

    return $mock;
}

describe('ProcessVideoUpload', function () {
    beforeEach(function () {
        Queue::fake();
    });

    describe('handle — happy path', function () {
        test('publishes the video and sets status to PUBLISHED when not scheduled', function () {
            $video = Video::factory()->processing()->create(['scheduled_at' => null]);

            $storage = mockStorage('/storage/videos/'.$video->vuid.'.mp4');
            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle($storage);

            $video->refresh();
            expect($video->status)->toBe(VideoStatus::PUBLISHED)
                ->and($video->video_url)->toBe('/storage/videos/'.$video->vuid.'.mp4');
        });

        test('sets status to SCHEDULED when scheduled_at is in the future', function () {
            $video = Video::factory()->processing()->create(['scheduled_at' => now()->addDay()]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            expect($video->fresh()->status)->toBe(VideoStatus::SCHEDULED);
        });

        test('sets status to PUBLISHED when scheduled_at is in the past', function () {
            $video = Video::factory()->processing()->create(['scheduled_at' => now()->subDay()]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            expect($video->fresh()->status)->toBe(VideoStatus::PUBLISHED);
        });
    });

    describe('handle — thumbnail', function () {
        test('publishes thumbnail and stores its url when provided', function () {
            $video = Video::factory()->processing()->create();

            $storage = Mockery::mock(VideoStorageService::class);
            $storage->shouldReceive('publishVideo')->andReturn('/storage/videos/test.mp4');
            $storage->shouldReceive('publishThumbnail')
                ->once()
                ->with('uploads/tmp/thumb.jpg', $video->vuid)
                ->andReturn('/storage/thumbnails/test.webp');

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4', 'uploads/tmp/thumb.jpg'))->handle($storage);

            expect($video->fresh()->thumbnail_url)->toBe('/storage/thumbnails/test.webp');
        });

        test('leaves thumbnail_url unchanged when no thumbnail is provided', function () {
            $video = Video::factory()->processing()->create(['thumbnail_url' => null]);

            $storage = Mockery::mock(VideoStorageService::class);
            $storage->shouldReceive('publishVideo')->andReturn('/storage/videos/test.mp4');
            $storage->shouldNotReceive('publishThumbnail');

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle($storage);

            expect($video->fresh()->thumbnail_url)->toBeNull();
        });
    });

    describe('handle — deleted video', function () {
        test('cleans up temp files and returns early when the video no longer exists', function () {
            $video = Video::factory()->create();
            $video->delete();

            $storage = Mockery::mock(VideoStorageService::class);
            $storage->shouldReceive('cleanupTmp')
                ->once()
                ->with('uploads/tmp/test.mp4', 'uploads/tmp/thumb.jpg');
            $storage->shouldNotReceive('publishVideo');
            $storage->shouldNotReceive('publishThumbnail');

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4', 'uploads/tmp/thumb.jpg'))->handle($storage);
        });
    });

    describe('failed', function () {
        test('marks the video as FAILED and cleans up temp files', function () {
            $video = Video::factory()->processing()->create();

            $storage = Mockery::mock(VideoStorageService::class);
            $storage->shouldReceive('cleanupTmp')
                ->once()
                ->with('uploads/tmp/test.mp4', 'uploads/tmp/thumb.jpg');

            app()->instance(VideoStorageService::class, $storage);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4', 'uploads/tmp/thumb.jpg'))
                ->failed(new RuntimeException('disk full'));

            expect($video->fresh()->status)->toBe(VideoStatus::FAILED);
        });

        test('still cleans up temp files even when the video was already deleted', function () {
            $video = Video::factory()->create();
            $video->delete();

            $storage = Mockery::mock(VideoStorageService::class);
            $storage->shouldReceive('cleanupTmp')->once();

            app()->instance(VideoStorageService::class, $storage);

            // should not throw
            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))
                ->failed(new RuntimeException);
        });
    });
});

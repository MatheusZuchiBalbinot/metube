<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Events\VideoPublished;
use App\Jobs\ProcessVideoUpload;
use App\Jobs\TranscodeVideoToHls;
use App\Models\Video;
use App\Services\VideoStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

/**
 * Return a mock VideoStorageService that stubs all methods with sensible defaults.
 *
 * @param string $videoPath Disk-relative path returned by publishVideo
 * @param string|null $thumbnailPath Disk-relative path returned by publishThumbnail
 */
function mockStorage(string $videoPath = 'videos/test.mp4', ?string $thumbnailPath = 'thumbnails/test.webp'): VideoStorageService
{
    $mock = Mockery::mock(VideoStorageService::class);
    $mock->shouldReceive('publishVideo')->andReturn($videoPath)->byDefault();
    $mock->shouldReceive('publishThumbnail')->andReturn($thumbnailPath)->byDefault();
    $mock->shouldReceive('cleanupTmp')->byDefault();

    return $mock;
}

describe('ProcessVideoUpload', function () {
    beforeEach(function () {
        Queue::fake();
    });

    describe('handle — batch happy path', function () {
        test('publishes batch video and sets status to PUBLISHED when not scheduled', function () {
            $video = Video::factory()->processing()->create(['scheduled_at' => null, 'is_batch' => true]);

            $storage = mockStorage('videos/' . $video->vuid . '.mp4');
            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle($storage);

            $video->refresh();
            expect($video->status)->toBe(VideoStatus::PUBLISHED)
                ->and($video->video_url)->toBe('videos/' . $video->vuid . '.mp4');
        });

        test('sets batch video to SCHEDULED when scheduled_at is in the future', function () {
            $video = Video::factory()->processing()->create(['scheduled_at' => now()->addDay(), 'is_batch' => true]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            expect($video->fresh()->status)->toBe(VideoStatus::SCHEDULED);
        });

        test('sets batch video to PUBLISHED when scheduled_at is in the past', function () {
            $video = Video::factory()->processing()->create(['scheduled_at' => now()->subDay(), 'is_batch' => true]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            expect($video->fresh()->status)->toBe(VideoStatus::PUBLISHED);
        });

        test('fires VideoPublished for batch video', function () {
            Event::fake([VideoPublished::class]);

            $video = Video::factory()->processing()->create(['scheduled_at' => null, 'is_batch' => true]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            Event::assertDispatched(VideoPublished::class);
        });

        test('dispatches TranscodeVideoToHls for batch video', function () {
            $video = Video::factory()->processing()->create(['scheduled_at' => null, 'is_batch' => true]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            Queue::assertPushed(TranscodeVideoToHls::class);
        });
    });

    describe('handle — single (non-batch) upload', function () {
        test('sets status to DRAFT for non-batch video', function () {
            $video = Video::factory()->processing()->create(['is_batch' => false]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            expect($video->fresh()->status)->toBe(VideoStatus::DRAFT);
        });

        test('dispatches TranscodeVideoToHls for non-batch video', function () {
            $video = Video::factory()->processing()->create(['is_batch' => false]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            Queue::assertPushed(TranscodeVideoToHls::class);
        });

        test('does not fire VideoPublished for non-batch video', function () {
            Event::fake([VideoPublished::class]);

            $video = Video::factory()->processing()->create(['is_batch' => false]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            Event::assertNotDispatched(VideoPublished::class);
        });

        test('ignores scheduled_at for non-batch video — always goes DRAFT', function () {
            $video = Video::factory()->processing()->create([
                'scheduled_at' => now()->addDay(),
                'is_batch' => false,
            ]);

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4'))->handle(mockStorage());

            expect($video->fresh()->status)->toBe(VideoStatus::DRAFT);
        });
    });

    describe('handle — thumbnail', function () {
        test('publishes thumbnail and stores its path when provided', function () {
            $video = Video::factory()->processing()->create(['is_batch' => true]);

            $storage = Mockery::mock(VideoStorageService::class);
            $storage->shouldReceive('publishVideo')->andReturn('videos/test.mp4');
            $storage->shouldReceive('publishThumbnail')
                ->once()
                ->with('uploads/tmp/thumb.jpg', $video->vuid)
                ->andReturn('thumbnails/test.webp');

            (new ProcessVideoUpload($video, 'uploads/tmp/test.mp4', 'uploads/tmp/thumb.jpg'))->handle($storage);

            expect($video->fresh()->thumbnail_url)->toBe('thumbnails/test.webp');
        });

        test('leaves thumbnail_url unchanged when no thumbnail is provided', function () {
            $video = Video::factory()->processing()->create(['thumbnail_url' => null, 'is_batch' => true]);

            $storage = Mockery::mock(VideoStorageService::class);
            $storage->shouldReceive('publishVideo')->andReturn('videos/test.mp4');
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
                ->failed(new RuntimeException());
        });
    });
});

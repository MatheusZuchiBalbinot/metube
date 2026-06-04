<?php

declare(strict_types=1);

use App\Services\ThumbnailService;
use App\Services\VideoStorageService;
use Illuminate\Support\Facades\Storage;

describe('VideoStorageService', function () {
    beforeEach(function () {
        Storage::fake('local');
        Storage::fake('public');
    });

    describe('publishVideo', function () {
        test('moves the file to public disk and returns disk-relative path', function () {
            Storage::disk('local')->put('uploads/tmp/abc123.mp4', 'fake video content');

            $service = new VideoStorageService(new ThumbnailService());
            $path = $service->publishVideo('uploads/tmp/abc123.mp4', 'abc123');

            expect($path)->toBe('videos/abc123.mp4');
            Storage::disk('public')->assertExists('videos/abc123.mp4');
            Storage::disk('local')->assertMissing('uploads/tmp/abc123.mp4');
        });

        test('preserves the original file extension', function () {
            Storage::disk('local')->put('uploads/tmp/abc123.webm', 'fake video');

            $service = new VideoStorageService(new ThumbnailService());
            $path = $service->publishVideo('uploads/tmp/abc123.webm', 'abc123');

            expect($path)->toBe('videos/abc123.webm');
            Storage::disk('public')->assertExists('videos/abc123.webm');
        });
    });

    describe('publishThumbnail', function () {
        test('converts to WebP, stores in public disk, and returns disk-relative path', function () {
            Storage::disk('local')->put('uploads/tmp/thumb.jpg', 'fake image');

            $thumbnails = Mockery::mock(ThumbnailService::class);
            $thumbnails->shouldReceive('convertToWebp')->once()->andReturn('webp-binary-content');

            $service = new VideoStorageService($thumbnails);
            $path = $service->publishThumbnail('uploads/tmp/thumb.jpg', 'abc123');

            expect($path)->toBe('thumbnails/abc123.webp');
            Storage::disk('public')->assertExists('thumbnails/abc123.webp');
            Storage::disk('local')->assertMissing('uploads/tmp/thumb.jpg');
        });

        test('passes the absolute filesystem path to ThumbnailService', function () {
            Storage::disk('local')->put('uploads/tmp/thumb.jpg', 'fake image');
            $expectedAbsolutePath = Storage::disk('local')->path('uploads/tmp/thumb.jpg');

            $thumbnails = Mockery::mock(ThumbnailService::class);
            $thumbnails->shouldReceive('convertToWebp')
                ->once()
                ->withArgs(fn (string $path) => $path === $expectedAbsolutePath)
                ->andReturn('webp-binary-content');

            $service = new VideoStorageService($thumbnails);
            $service->publishThumbnail('uploads/tmp/thumb.jpg', 'abc123');
        });
    });

    describe('cleanupTmp', function () {
        test('deletes both video and thumbnail temp files', function () {
            Storage::disk('local')->put('uploads/tmp/video.mp4', 'content');
            Storage::disk('local')->put('uploads/tmp/thumb.jpg', 'content');

            $service = new VideoStorageService(new ThumbnailService());
            $service->cleanupTmp('uploads/tmp/video.mp4', 'uploads/tmp/thumb.jpg');

            Storage::disk('local')->assertMissing('uploads/tmp/video.mp4');
            Storage::disk('local')->assertMissing('uploads/tmp/thumb.jpg');
        });

        test('deletes only the video file when thumbnail path is null', function () {
            Storage::disk('local')->put('uploads/tmp/video.mp4', 'content');

            $service = new VideoStorageService(new ThumbnailService());
            $service->cleanupTmp('uploads/tmp/video.mp4', null);

            Storage::disk('local')->assertMissing('uploads/tmp/video.mp4');
        });
    });
});

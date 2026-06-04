<?php

declare(strict_types=1);

use App\Services\StorageService;
use Illuminate\Support\Facades\Storage;

describe('StorageService', function () {
    beforeEach(function () {
        Storage::fake('local');
        Storage::fake('public');
    });

    describe('moveFile', function () {
        test('relocates a source file onto the local disk', function () {
            $source = (string) tempnam(sys_get_temp_dir(), 'ss');
            file_put_contents($source, 'video bytes');

            $storage = new StorageService();
            $storage->ensureDirectoryExists('uploads/tmp');
            $storage->moveFile($source, 'uploads/tmp/vid.mp4');

            Storage::disk('local')->assertExists('uploads/tmp/vid.mp4');
            expect(file_exists($source))->toBeFalse();
        });
    });

    describe('tempPath', function () {
        test('returns absolute path for a temp-disk-relative path', function () {
            $path = (new StorageService())->tempPath('uploads/tmp/video.mp4');

            expect($path)->toContain('uploads/tmp/video.mp4');
        });
    });

    describe('deleteTempFile', function () {
        test('removes a file from the temp disk', function () {
            Storage::disk('local')->put('uploads/tmp/video.mp4', 'x');

            (new StorageService())->deleteTempFile('uploads/tmp/video.mp4');

            Storage::disk('local')->assertMissing('uploads/tmp/video.mp4');
        });
    });

    describe('ensureDirectoryExists', function () {
        test('creates the directory on the temp disk', function () {
            (new StorageService())->ensureDirectoryExists('uploads/tmp');

            expect(Storage::disk('local')->exists('uploads/tmp'))->toBeTrue();
        });
    });

    describe('publicPath', function () {
        test('returns absolute path for a public-disk-relative path', function () {
            $path = (new StorageService())->publicPath('videos/vid.mp4');

            expect($path)->toContain('videos/vid.mp4');
        });
    });

    describe('publicUrl', function () {
        test('returns a URL containing the given path', function () {
            $url = (new StorageService())->publicUrl('thumbnails/abc.webp');

            expect($url)->toContain('thumbnails/abc.webp');
        });
    });

    describe('putPublic', function () {
        test('writes a file to the public disk', function () {
            (new StorageService())->putPublic('captions/vid.en.vtt', 'WEBVTT');

            Storage::disk('public')->assertExists('captions/vid.en.vtt');
            expect(Storage::disk('public')->get('captions/vid.en.vtt'))->toBe('WEBVTT');
        });
    });

    describe('existsPublic', function () {
        test('returns true when the file exists on the public disk', function () {
            Storage::disk('public')->put('videos/vid.mp4', 'x');

            expect((new StorageService())->existsPublic('videos/vid.mp4'))->toBeTrue();
        });

        test('returns false when the file is absent', function () {
            expect((new StorageService())->existsPublic('videos/missing.mp4'))->toBeFalse();
        });
    });

    describe('deleteFile', function () {
        test('removes a file from the public disk', function () {
            Storage::disk('public')->put('videos/vid.mp4', 'x');

            (new StorageService())->deleteFile('videos/vid.mp4');

            Storage::disk('public')->assertMissing('videos/vid.mp4');
        });
    });

    describe('deleteDirectory', function () {
        test('removes a directory from the public disk', function () {
            Storage::disk('public')->put('hls/vid/master.m3u8', 'x');

            (new StorageService())->deleteDirectory('hls/vid');

            Storage::disk('public')->assertMissing('hls/vid/master.m3u8');
        });
    });
});

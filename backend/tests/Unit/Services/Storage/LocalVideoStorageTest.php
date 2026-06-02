<?php

declare(strict_types=1);

use App\Services\Storage\LocalVideoStorage;
use Illuminate\Support\Facades\Storage;

describe('LocalVideoStorage', function () {
    beforeEach(function () {
        Storage::fake('local');
        Storage::fake('public');
    });

    test('moveFile relocates a source file onto the local disk', function () {
        $source = (string) tempnam(sys_get_temp_dir(), 'lvs');
        file_put_contents($source, 'video bytes');

        $storage = new LocalVideoStorage;
        $storage->ensureDirectoryExists('uploads/tmp');
        $storage->moveFile($source, 'uploads/tmp/vid.mp4');

        Storage::disk('local')->assertExists('uploads/tmp/vid.mp4');
        expect(file_exists($source))->toBeFalse();
    });

    test('delete removes a file from the public disk', function () {
        Storage::disk('public')->put('videos/vid.mp4', 'x');

        (new LocalVideoStorage)->delete('videos/vid.mp4');

        Storage::disk('public')->assertMissing('videos/vid.mp4');
    });

    test('deleteDirectory removes a directory from the public disk', function () {
        Storage::disk('public')->put('hls/vid/master.m3u8', 'x');

        (new LocalVideoStorage)->deleteDirectory('hls/vid');

        Storage::disk('public')->assertMissing('hls/vid/master.m3u8');
    });
});

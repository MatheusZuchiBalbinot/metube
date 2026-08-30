<?php

declare(strict_types=1);

use App\Contracts\StorageContract;
use App\Support\VideoFileManager;

describe('VideoFileManager', function () {
    test('moveVideoFromTus ensures the tmp directory, moves the file, and returns the path', function () {
        $storage = Mockery::mock(StorageContract::class);
        $storage->shouldReceive('ensureDirectoryExists')->once()->with('uploads/tmp');
        $storage->shouldReceive('moveFile')->once()->with('/tmp/tus/abc', 'uploads/tmp/vid_1.mp4');

        $manager = new VideoFileManager($storage);
        $path = $manager->moveVideoFromTus(['file_path' => '/tmp/tus/abc', 'name' => 'clip.mp4'], 'vid_1');

        expect($path)->toBe('uploads/tmp/vid_1.mp4');
    });

    test('moveVideoFromTus falls back to mp4 when the source name has no extension', function () {
        $storage = Mockery::mock(StorageContract::class);
        $storage->shouldReceive('ensureDirectoryExists')->once();
        $storage->shouldReceive('moveFile')->once()->with('/tmp/tus/abc', 'uploads/tmp/vid_2.mp4');

        $manager = new VideoFileManager($storage);
        $path = $manager->moveVideoFromTus(['file_path' => '/tmp/tus/abc', 'name' => 'noextension'], 'vid_2');

        expect($path)->toBe('uploads/tmp/vid_2.mp4');
    });

    test('moveVideoFromTus lowercases the resolved extension', function () {
        $storage = Mockery::mock(StorageContract::class);
        $storage->shouldReceive('ensureDirectoryExists')->once();
        $storage->shouldReceive('moveFile')->once()->with('/tmp/tus/abc', 'uploads/tmp/vid_3.mov');

        $manager = new VideoFileManager($storage);
        $path = $manager->moveVideoFromTus(['file_path' => '/tmp/tus/abc', 'name' => 'CLIP.MOV'], 'vid_3');

        expect($path)->toBe('uploads/tmp/vid_3.mov');
    });

    test('moveThumbnailFromTus moves the thumbnail and falls back to jpg', function () {
        $storage = Mockery::mock(StorageContract::class);
        $storage->shouldReceive('moveFile')->once()->with('/tmp/tus/thumb', 'uploads/tmp/thumb_vid_4.jpg');

        $manager = new VideoFileManager($storage);
        $path = $manager->moveThumbnailFromTus(['file_path' => '/tmp/tus/thumb', 'name' => 'picture'], 'vid_4');

        expect($path)->toBe('uploads/tmp/thumb_vid_4.jpg');
    });

    test('moveVideoFromTus falls back to mp4 for a disallowed extension (stored XSS guard)', function () {
        $storage = Mockery::mock(StorageContract::class);
        $storage->shouldReceive('ensureDirectoryExists')->once();
        $storage->shouldReceive('moveFile')->once()->with('/tmp/tus/abc', 'uploads/tmp/vid_5.mp4');

        $manager = new VideoFileManager($storage);
        $path = $manager->moveVideoFromTus(['file_path' => '/tmp/tus/abc', 'name' => 'payload.html'], 'vid_5');

        expect($path)->toBe('uploads/tmp/vid_5.mp4');
    });

    test('moveVideoFromTus falls back to mp4 for an svg extension', function () {
        $storage = Mockery::mock(StorageContract::class);
        $storage->shouldReceive('ensureDirectoryExists')->once();
        $storage->shouldReceive('moveFile')->once()->with('/tmp/tus/abc', 'uploads/tmp/vid_6.mp4');

        $manager = new VideoFileManager($storage);
        $path = $manager->moveVideoFromTus(['file_path' => '/tmp/tus/abc', 'name' => 'payload.svg'], 'vid_6');

        expect($path)->toBe('uploads/tmp/vid_6.mp4');
    });

    test('moveThumbnailFromTus falls back to jpg for a disallowed extension (stored XSS guard)', function () {
        $storage = Mockery::mock(StorageContract::class);
        $storage->shouldReceive('moveFile')->once()->with('/tmp/tus/thumb', 'uploads/tmp/thumb_vid_7.jpg');

        $manager = new VideoFileManager($storage);
        $path = $manager->moveThumbnailFromTus(['file_path' => '/tmp/tus/thumb', 'name' => 'payload.svg'], 'vid_7');

        expect($path)->toBe('uploads/tmp/thumb_vid_7.jpg');
    });
});

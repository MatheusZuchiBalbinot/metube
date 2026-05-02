<?php

use App\Services\ThumbnailService;

describe('ThumbnailService', function () {
    beforeEach(function () {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD extension is required.');
        }
    });

    test('converts source image to WebP format', function () {
        $service = new ThumbnailService;
        $source = createTestImage(100, 100);

        $webp = $service->convertToWebp($source);

        // WebP files always start with "RIFF" and contain "WEBP" at offset 8
        expect(substr($webp, 0, 4))->toBe('RIFF')
            ->and(substr($webp, 8, 4))->toBe('WEBP')
            ->and($webp)->not->toBeEmpty();

        unlink($source);
    });

    test('scales down images larger than the max dimensions', function () {
        $service = new ThumbnailService;
        $source = createTestImage(2000, 2000);

        $webp = $service->convertToWebp($source, maxWidth: 320, maxHeight: 180);
        $image = imagecreatefromstring($webp);

        expect(imagesx($image))->toBeLessThanOrEqual(320)
            ->and(imagesy($image))->toBeLessThanOrEqual(180);

        imagedestroy($image);
        unlink($source);
    });

    test('does not upscale images smaller than the max dimensions', function () {
        $service = new ThumbnailService;
        $source = createTestImage(100, 50);

        $webp = $service->convertToWebp($source, maxWidth: 1280, maxHeight: 720);
        $image = imagecreatefromstring($webp);

        expect(imagesx($image))->toBe(100)
            ->and(imagesy($image))->toBe(50);

        imagedestroy($image);
        unlink($source);
    });

    test('preserves aspect ratio when scaling', function () {
        $service = new ThumbnailService;
        // 1600×400 — very wide; constrained to maxWidth=800
        $source = createTestImage(1600, 400);

        $webp = $service->convertToWebp($source, maxWidth: 800, maxHeight: 800);
        $image = imagecreatefromstring($webp);

        expect(imagesx($image))->toBe(800)
            ->and(imagesy($image))->toBe(200); // aspect ratio maintained

        imagedestroy($image);
        unlink($source);
    });
});

/**
 * Helper: create a temporary PNG file filled with a solid colour and return its path.
 *
 * @return string Absolute filesystem path to the temp file
 */
function createTestImage(int $width, int $height): string
{
    $path = tempnam(sys_get_temp_dir(), 'thumb_test_').'.png';
    $image = imagecreatetruecolor($width, $height);
    $color = imagecolorallocate($image, 100, 149, 237);
    imagefilledrectangle($image, 0, 0, $width - 1, $height - 1, $color);
    imagepng($image, $path);
    imagedestroy($image);

    return $path;
}

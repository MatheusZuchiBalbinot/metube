<?php

declare(strict_types=1);

use App\Contracts\StorageContract;
use App\DTOs\HlsRenditionProfile;
use App\Services\HlsTranscodeService;

describe('HlsTranscodeService', function () {
    beforeEach(function () {
        $this->service = new HlsTranscodeService(Mockery::mock(StorageContract::class));
    });

    describe('selectRenditions', function () {
        beforeEach(function () {
            config(['media.hls.renditions' => [
                ['height' => 360,  'video_bitrate' => '800k',  'audio_bitrate' => '128k'],
                ['height' => 480,  'video_bitrate' => '1400k', 'audio_bitrate' => '128k'],
                ['height' => 720,  'video_bitrate' => '2800k', 'audio_bitrate' => '128k'],
                ['height' => 1080, 'video_bitrate' => '5000k', 'audio_bitrate' => '192k'],
            ]]);
        });

        test('returns all four renditions for a 1080p source', function () {
            $renditions = $this->service->selectRenditions(1080);

            expect($renditions)->toHaveCount(4)
                ->and($renditions[0]->height)->toBe(360)
                ->and($renditions[1]->height)->toBe(480)
                ->and($renditions[2]->height)->toBe(720)
                ->and($renditions[3]->height)->toBe(1080);
        });

        test('returns three renditions for a 720p source', function () {
            $renditions = $this->service->selectRenditions(720);

            expect($renditions)->toHaveCount(3)
                ->and($renditions[2]->height)->toBe(720);
        });

        test('returns two renditions for a 480p source', function () {
            $renditions = $this->service->selectRenditions(480);

            expect($renditions)->toHaveCount(2)
                ->and($renditions[1]->height)->toBe(480);
        });

        test('returns one rendition for a 360p source', function () {
            $renditions = $this->service->selectRenditions(360);

            expect($renditions)->toHaveCount(1)
                ->and($renditions[0]->height)->toBe(360);
        });

        test('returns a native-height passthrough rendition when source is below the ladder', function () {
            $renditions = $this->service->selectRenditions(240);

            expect($renditions)->toHaveCount(1)
                ->and($renditions[0]->height)->toBe(240)
                ->and($renditions[0]->videoBitrate)->toBe('800k');
        });

        test('returns profiles with correct bitrates', function () {
            $renditions = $this->service->selectRenditions(1080);

            expect($renditions[0]->videoBitrate)->toBe('800k')
                ->and($renditions[0]->audioBitrate)->toBe('128k')
                ->and($renditions[3]->videoBitrate)->toBe('5000k')
                ->and($renditions[3]->audioBitrate)->toBe('192k');
        });

        test('returns single passthrough rendition when config has no renditions', function () {
            config(['media.hls.renditions' => []]);
            $renditions = $this->service->selectRenditions(720);

            expect($renditions)->toHaveCount(1)
                ->and($renditions[0])->toBeInstanceOf(HlsRenditionProfile::class)
                ->and($renditions[0]->height)->toBe(720);
        });

        test('returns renditions sorted ascending by height regardless of config order', function () {
            config(['media.hls.renditions' => [
                ['height' => 1080, 'video_bitrate' => '5000k', 'audio_bitrate' => '192k'],
                ['height' => 360,  'video_bitrate' => '800k',  'audio_bitrate' => '128k'],
                ['height' => 720,  'video_bitrate' => '2800k', 'audio_bitrate' => '128k'],
            ]]);

            $renditions = $this->service->selectRenditions(1080);

            expect($renditions[0]->height)->toBe(360)
                ->and($renditions[1]->height)->toBe(720)
                ->and($renditions[2]->height)->toBe(1080);
        });
    });
});

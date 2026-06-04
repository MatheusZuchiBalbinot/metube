<?php

declare(strict_types=1);

namespace App\DTOs;

/**
 * Immutable descriptor for a single HLS rendition (quality level).
 *
 * Height drives both the ffmpeg scale filter and the rendition selection
 * logic in {@see \App\Services\HlsTranscodeService::selectRenditions()}.
 */
final readonly class HlsRenditionProfile
{
    /**
     * @param int $height Target output height in pixels (e.g. 360, 720, 1080)
     * @param string $videoBitrate Target video bitrate (e.g. "2800k")
     * @param string $audioBitrate Target audio bitrate (e.g. "128k")
     */
    public function __construct(
        public int $height,
        public string $videoBitrate,
        public string $audioBitrate,
    ) {}
}

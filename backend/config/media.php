<?php

declare(strict_types=1);

return [

    'thumbnail' => [
        'quality' => (int) env('THUMBNAIL_QUALITY', 80),
        'max_width' => (int) env('THUMBNAIL_MAX_WIDTH', 1280),
        'max_height' => (int) env('THUMBNAIL_MAX_HEIGHT', 720),
    ],

    'hls' => [
        'ffmpeg' => env('FFMPEG_PATH', 'ffmpeg'),
        'ffprobe' => env('FFPROBE_PATH', 'ffprobe'),
        'segment_duration' => (int) env('HLS_SEGMENT_DURATION', 6),
        'audio_bitrate' => env('HLS_AUDIO_BITRATE', '128k'),
        'process_timeout' => (int) env('HLS_PROCESS_TIMEOUT', 3600),

        /*
        |----------------------------------------------------------------------
        | Adaptive Bitrate Ladder
        |----------------------------------------------------------------------
        |
        | Renditions are filtered to those whose height does not exceed the
        | source video height, so a 720p upload never produces a 1080p rendition.
        | If the source is below the lowest entry (360p), a single passthrough
        | rendition is created at the native source resolution.
        |
        */
        'renditions' => [
            ['height' => 360,  'video_bitrate' => '800k',  'audio_bitrate' => '128k'],
            ['height' => 480,  'video_bitrate' => '1400k', 'audio_bitrate' => '128k'],
            ['height' => 720,  'video_bitrate' => '2800k', 'audio_bitrate' => '128k'],
            ['height' => 1080, 'video_bitrate' => '5000k', 'audio_bitrate' => '192k'],
        ],
    ],

];

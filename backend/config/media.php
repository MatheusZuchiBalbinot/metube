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
    ],

];

<?php

return [

    'thumbnail' => [
        'quality' => (int) env('THUMBNAIL_QUALITY', 80),
        'max_width'  => (int) env('THUMBNAIL_MAX_WIDTH', 1280),
        'max_height' => (int) env('THUMBNAIL_MAX_HEIGHT', 720),
    ],

];

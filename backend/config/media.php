<?php

return [

    'thumbnail' => [
        'max_width'  => (int) env('THUMBNAIL_MAX_WIDTH', 1280),
        'max_height' => (int) env('THUMBNAIL_MAX_HEIGHT', 720),
        'quality' => (int) env('THUMBNAIL_QUALITY', 80),
    ],

];

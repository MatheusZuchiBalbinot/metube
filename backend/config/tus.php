<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Temporary upload directory
    |--------------------------------------------------------------------------
    |
    | tus-php writes chunks here while the upload is in progress.
    | Ensure the directory is writable and excluded from public access.
    |
    */
    'upload_dir' => storage_path('app/uploads/tus'),

    /*
    |--------------------------------------------------------------------------
    | Upload session TTL (seconds)
    |--------------------------------------------------------------------------
    |
    | How long a resumable upload session stays alive in Redis.
    | After this window the client must start over.
    |
    */
    'ttl' => 6 * 3600,

    /*
    |--------------------------------------------------------------------------
    | Maximum upload size (bytes)
    |--------------------------------------------------------------------------
    |
    | 0 = no limit enforced by tus-php itself (nginx / PHP already cap it).
    | Set to a positive value to enforce an explicit cap here too.
    |
    */
    'max_size' => (int) env('TUS_MAX_UPLOAD_BYTES', 5 * 1024 * 1024 * 1024),

    /*
    |--------------------------------------------------------------------------
    | API path
    |--------------------------------------------------------------------------
    |
    | Must match the route registered in api.php.
    | Used by tus-php to build the Location header sent to the client.
    |
    */
    'api_path' => '/api/uploads/tus',
];

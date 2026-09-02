<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Single source of truth for video/thumbnail upload size limits.
 *
 * MIME/extension allowlists live in {@see MimeTypes} — kept separate
 * so each file's name matches exactly what it contains.
 *
 * Consumed by:
 * - {@see \App\Http\Requests\Video\StoreVideoRequest} — Laravel `max:` rules
 *   for the direct multipart upload path.
 * - `config/tus.php` — tus-php's own max upload size, so the resumable path
 *   cannot accept a larger file than the direct path.
 */
final class UploadLimits
{
    /** Maximum size of a video upload, in bytes. */
    public const VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024;

    /** Maximum size of a thumbnail upload, in bytes. */
    public const THUMBNAIL_MAX_BYTES = 10 * 1024 * 1024;

    /** Maximum size of a video upload, in kilobytes — the unit Laravel's `max:` rule expects. */
    public const VIDEO_MAX_KB = self::VIDEO_MAX_BYTES / 1024;

    /** Maximum size of a thumbnail upload, in kilobytes — the unit Laravel's `max:` rule expects. */
    public const THUMBNAIL_MAX_KB = self::THUMBNAIL_MAX_BYTES / 1024;

    /**
     * Maximum total bytes a user may have reserved across concurrent tus
     * sessions — bounds aggregate disk use, which a single-file cap doesn't.
     *
     * @see \App\Services\Tus\TusQuotaService
     */
    public const TUS_USER_QUOTA_BYTES = self::VIDEO_MAX_BYTES * 4;

    private function __construct() {}
}

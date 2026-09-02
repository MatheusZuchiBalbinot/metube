<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Single source of truth for video/thumbnail upload MIME and extension allowlists.
 *
 * Size limits live in {@see UploadLimits} — kept separate so each file's
 * name matches exactly what it contains.
 *
 * Consumed by:
 * - {@see \App\Http\Requests\Video\StoreVideoRequest} — Laravel `mimes:` rules
 *   for the direct multipart upload path.
 * - {@see \App\Services\VideoUploadService} — real content-type verification
 *   (via `finfo`) of tus-assembled files, which never pass through Laravel's
 *   file validation rules.
 * - {@see \App\Support\VideoFileManager} — extension allowlist applied to the
 *   client-supplied tus filename before it is used to build a disk path.
 */
final class MimeTypes
{
    /**
     * Allowed values for Laravel's `mimes:` rule on the direct multipart upload path.
     */
    public const VIDEO_MIMES = ['mp4', 'webm', 'ogg', 'mov', 'avi'];

    /**
     * Allowed values for Laravel's `mimes:` rule on the direct multipart upload path.
     */
    public const IMAGE_MIMES = ['jpeg', 'png', 'webp'];

    /**
     * Allowed file extensions for tus-assembled video uploads. Matched against
     * the client-supplied filename before it is used to build a disk path —
     * anything outside this list falls back to a safe default extension.
     */
    public const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi'];

    /**
     * Allowed file extensions for tus-assembled thumbnail uploads. Matched
     * against the client-supplied filename before it is used to build a disk
     * path — anything outside this list falls back to a safe default extension.
     */
    public const IMAGE_EXTENSIONS = ['jpeg', 'jpg', 'png', 'webp'];

    /**
     * Real MIME types accepted for the assembled video file, verified via
     * `finfo` against the actual bytes on disk. tus uploads skip Laravel's
     * `mimes:` rule entirely, so this is the only content-type check they get.
     */
    public const VIDEO_MIME_TYPES = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/avi',
    ];

    /**
     * Real MIME types accepted for the assembled thumbnail file, verified via
     * `finfo` against the actual bytes on disk.
     */
    public const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    private function __construct() {}
}

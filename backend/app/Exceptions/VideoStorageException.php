<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a video file cannot be persisted to its final storage location.
 *
 * The message embeds the source and destination paths for server-side logs;
 * because this surfaces only from queued jobs it never reaches API clients.
 */
class VideoStorageException extends RuntimeException
{
    /**
     * The atomic move from temporary to public storage failed.
     *
     * @param string $source Absolute path of the source file
     * @param string $destination Absolute path of the intended destination
     */
    public static function moveFailed(string $source, string $destination): self
    {
        return new self("Could not move video file: {$source} → {$destination}");
    }
}

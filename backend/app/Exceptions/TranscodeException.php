<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Thrown when an ffmpeg/ffprobe transcoding command fails.
 *
 * The underlying ProcessFailedException is chained as the previous exception so
 * the full command output remains available in server-side logs without being
 * surfaced to clients.
 */
class TranscodeException extends RuntimeException
{
    public static function commandFailed(string $reason, ?Throwable $previous = null): self
    {
        return new self("ffmpeg/ffprobe command failed: {$reason}", 0, $previous);
    }
}

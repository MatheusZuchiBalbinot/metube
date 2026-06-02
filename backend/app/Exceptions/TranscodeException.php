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
    /**
     * @param string $reason Short description of the failing command
     * @param Throwable|null $previous The underlying process failure, if any
     */
    public static function commandFailed(string $reason, ?Throwable $previous = null): self
    {
        return new self("ffmpeg/ffprobe command failed: {$reason}", 0, $previous);
    }
}

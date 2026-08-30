<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Thrown by VideoPublishingService::publishVideo() when the target video is
 * not in DRAFT status.
 *
 * Enforcing this in the service — not the controller — means every caller
 * (HTTP controller, artisan command, job, seeder) is protected by the same
 * "only a draft video can be published" rule, instead of each caller having
 * to remember to re-check it.
 */
class VideoNotDraftException extends Exception
{
    public function __construct()
    {
        parent::__construct('Video is not in draft status.');
    }
}

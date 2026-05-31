<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\VideoImpressionsBatch;
use App\Models\UserAnalytic;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class LogImpressionsBatch implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'analytics';

    /** @var int */
    public $tries = 3;

    /**
     * Bulk-insert all impression rows in a single query.
     */
    public function handle(VideoImpressionsBatch $event): void
    {
        $rows = $event->toAnalyticRows();

        if ($rows === []) {
            return;
        }

        UserAnalytic::insert($rows);
    }
}

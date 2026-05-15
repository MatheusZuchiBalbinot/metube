<?php

namespace App\Listeners;

use App\Events\VideoImpressionsBatch;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Support\Facades\DB;

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

        DB::table('user_analytics')->insert($rows);
    }
}

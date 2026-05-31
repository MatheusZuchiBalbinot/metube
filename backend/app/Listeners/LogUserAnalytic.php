<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Contracts\LoggableUserEvent;
use App\Models\UserAnalytic;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class LogUserAnalytic implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'analytics';

    /** @var int */
    public $tries = 3;

    /**
     * Persist a loggable user event into user_analytics.
     *
     * Runs only after the surrounding DB transaction commits, so we never
     * record events for actions that ended up rolled back.
     */
    public function handle(LoggableUserEvent $event): void
    {
        UserAnalytic::create($event->toAnalyticRow());
    }
}

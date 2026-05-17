<?php

namespace App\Listeners;

use App\Enums\VideoStatus;
use App\Events\VideoStatusUpdated;
use App\Notifications\VideoProcessedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendVideoProcessedNotification implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'notifications';

    /** @var int */
    public $tries = 3;

    /**
     * Notify the video owner when their video finishes processing (published or failed).
     *
     * Skips intermediate statuses like PROCESSING, SCHEDULED, DRAFT.
     */
    public function handle(VideoStatusUpdated $event): void
    {
        $isTerminal = $event->status === VideoStatus::PUBLISHED || $event->status === VideoStatus::FAILED;

        if (! $isTerminal) {
            return;
        }

        $owner = $event->video->channel;
        $owner->notify(new VideoProcessedNotification($event->video));
    }
}

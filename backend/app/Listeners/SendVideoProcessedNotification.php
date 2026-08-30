<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\VideoStatus;
use App\Events\VideoStatusUpdated;
use App\Listeners\Traits\SendsQueuedNotifications;
use App\Notifications\VideoProcessedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendVideoProcessedNotification implements ShouldQueueAfterCommit
{
    use SendsQueuedNotifications;

    public function handle(VideoStatusUpdated $event): void
    {
        $isTerminal = $event->newStatus === VideoStatus::PUBLISHED || $event->newStatus === VideoStatus::FAILED;

        if (!$isTerminal) {
            return;
        }

        $owner = $event->video->channel;
        $owner->notify(new VideoProcessedNotification($event->video));
    }
}

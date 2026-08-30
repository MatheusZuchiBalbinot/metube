<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\VideoTranscriptionCompleted;
use App\Listeners\Traits\SendsQueuedNotifications;
use App\Notifications\VideoTranscribedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendVideoTranscriptionCompletedListener implements ShouldQueueAfterCommit
{
    use SendsQueuedNotifications;

    public function handle(VideoTranscriptionCompleted $event): void
    {
        $owner = $event->video->channel;
        $owner->notify(new VideoTranscribedNotification($event->video));
    }
}

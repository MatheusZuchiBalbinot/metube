<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\VideoTranscriptionStarted;
use App\Listeners\Traits\SendsQueuedNotifications;
use App\Notifications\VideoTranscriptionStartedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendVideoTranscriptionStartedListener implements ShouldQueueAfterCommit
{
    use SendsQueuedNotifications;

    public function handle(VideoTranscriptionStarted $event): void
    {
        $owner = $event->video->channel;
        $owner->notify(new VideoTranscriptionStartedNotification($event->video));
    }
}

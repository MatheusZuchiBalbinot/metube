<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\TranscriptionStatus;
use App\Events\TranscriptionStatusUpdated;
use App\Listeners\Traits\SendsQueuedNotifications;
use App\Notifications\VideoTranscriptionFailedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

/**
 * TranscriptionStatusUpdated also fires on PROCESSING — only FAILED notifies the owner.
 */
class SendVideoTranscriptionFailedNotification implements ShouldQueueAfterCommit
{
    use SendsQueuedNotifications;

    public function handle(TranscriptionStatusUpdated $event): void
    {
        if ($event->status !== TranscriptionStatus::FAILED) {
            return;
        }

        $owner = $event->video->channel;
        $owner->notify(new VideoTranscriptionFailedNotification($event->video));
    }
}

<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\TranscriptionStatus;
use App\Events\TranscriptionStatusUpdated;
use App\Notifications\VideoTranscribedNotification;
use App\Notifications\VideoTranscriptionStartedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendVideoTranscribedNotification implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'notifications';

    /** @var int */
    public $tries = 3;

    /**
     * Notify the video owner when their video has been successfully transcribed.
     */
    public function handle(TranscriptionStatusUpdated $event): void
    {
        $owner = $event->video->channel;

        if ($event->status === TranscriptionStatus::PROCESSING) {
            $owner->notify(new VideoTranscriptionStartedNotification($event->video));

            return;
        }

        if ($event->status === TranscriptionStatus::COMPLETED) {
            $owner->notify(new VideoTranscribedNotification($event->video));
        }
    }
}

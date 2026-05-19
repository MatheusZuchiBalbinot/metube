<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoFromSubscriptionNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Notification;

class NotifySubscribersChunk implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var string */
    public $queue = 'notifications';

    /** @var int */
    public $tries = 3;

    /** @var int */
    public $timeout = 120;

    /**
     * @param  Video  $video  The newly published video
     * @param  list<int>  $userIds  Subscriber ids in this chunk
     */
    public function __construct(
        private readonly Video $video,
        private readonly array $userIds,
    ) {}

    public function handle(): void
    {
        if ($this->userIds === []) {
            return;
        }

        $users = User::whereIn('id', $this->userIds)->get();

        if ($users->isEmpty()) {
            return;
        }

        Notification::sendNow($users, new VideoFromSubscriptionNotification($this->video));
    }
}

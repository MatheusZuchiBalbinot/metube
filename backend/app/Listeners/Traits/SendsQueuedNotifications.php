<?php

declare(strict_types=1);

namespace App\Listeners\Traits;

use App\Models\User;
use Illuminate\Queue\InteractsWithQueue;

trait SendsQueuedNotifications
{
    use InteractsWithQueue;

    public string $queue = 'notifications';

    public int $delay = 0;

    /** @var int Attempts before the queued notification is marked as failed */
    public int $tries = 3;

    /**
     * @param User $actor User performing the action (liker, commenter, etc.)
     * @param User $target User being notified (video owner, comment author, etc.)
     */
    protected function shouldSkipSelfNotification(User $actor, User $target): bool
    {
        return $actor->id === $target->id;
    }
}

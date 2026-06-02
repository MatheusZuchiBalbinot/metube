<?php

declare(strict_types=1);

namespace App\Listeners\Traits;

use App\Models\User;
use Illuminate\Queue\InteractsWithQueue;

/**
 * SendsQueuedNotifications — Shared logic for notification listeners.
 *
 * Provides:
 * - Queue and delay configuration (notifications queue)
 * - Self-notification skip logic (never notify the actor)
 *
 * Use in listener classes that also implement ShouldQueue.
 */
trait SendsQueuedNotifications
{
    use InteractsWithQueue;

    public string $queue = 'notifications';

    public int $delay = 0;

    /** @var int Attempts before the queued notification is marked as failed */
    public int $tries = 3;

    /**
     * Determine if notification should be skipped because user is notifying themselves.
     *
     * @param User $actor User performing the action (liker, commenter, etc.)
     * @param User $target User being notified (video owner, comment author, etc.)
     *
     * @return bool True if notification should be skipped
     */
    protected function shouldSkipSelfNotification(User $actor, User $target): bool
    {
        return $actor->id === $target->id;
    }
}

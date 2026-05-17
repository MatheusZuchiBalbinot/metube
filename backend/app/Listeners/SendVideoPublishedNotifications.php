<?php

namespace App\Listeners;

use App\Events\VideoPublished;
use App\Notifications\VideoFromSubscriptionNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Support\Facades\DB;

class SendVideoPublishedNotifications implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'notifications';

    /** @var int */
    public $tries = 3;

    /**
     * Notify all subscribers of the channel when a new video is published.
     *
     * Loads subscribers in chunks to avoid loading thousands of models at once.
     */
    public function handle(VideoPublished $event): void
    {
        $video = $event->video->fresh(['channel']);
        $channel = $video !== null ? $video->channel : null;

        if ($channel === null) {
            return;
        }

        $channelId = $channel->id;

        DB::table('user_subscriptions')
            ->where('channel_id', $channelId)
            ->select('subscriber_id')
            ->orderBy('subscriber_id')
            ->chunkById(200, function ($rows) use ($video): void {
                foreach ($rows as $row) {
                    \App\Models\User::find($row->subscriber_id)?->notify(
                        new VideoFromSubscriptionNotification($video)
                    );
                }
            }, 'subscriber_id');
    }
}

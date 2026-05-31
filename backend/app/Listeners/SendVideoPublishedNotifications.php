<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\VideoPublished;
use App\Jobs\NotifySubscribersChunk;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Support\Facades\DB;

class SendVideoPublishedNotifications implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'notifications';

    /** @var int */
    public $tries = 3;

    /** Subscribers per fan-out child job. */
    private const CHUNK_SIZE = 500;

    /**
     * Fan out notifications to all subscribers via chunked child jobs.
     *
     * The work is split into NotifySubscribersChunk jobs so the notifications
     * supervisor can parallelize the load across workers instead of one
     * worker iterating a single 100k-row stream.
     */
    public function handle(VideoPublished $event): void
    {
        $video = $event->video->fresh(['channel']);
        $channel = $video !== null ? $video->channel : null;

        if ($channel === null) {
            return;
        }

        DB::table('user_subscriptions')
            ->where('channel_id', $channel->id)
            ->select('user_id')
            ->orderBy('user_id')
            ->chunkById(self::CHUNK_SIZE, function ($rows) use ($video): void {
                $ids = $rows->pluck('user_id')->all();
                NotifySubscribersChunk::dispatch($video, $ids);
            }, 'user_id');
    }
}

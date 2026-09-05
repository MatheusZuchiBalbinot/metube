<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Video;
use App\Support\ToggleGuard;
use App\Support\ToggleOutcome;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

/**
 * ChannelService — Business logic for channels.
 */
final class ChannelService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * @throws ModelNotFoundException
     */
    public function getByUuid(string $uuid): User
    {
        return $this->cache->rememberChannelInfo(
            $uuid,
            fn () => User::query()->byUuid($uuid)->firstOrFail(),
        );
    }

    /**
     * When $includeAllStatuses is true, returns every status (processing, failed, draft, etc.)
     * ordered by recency — used when the channel owner is viewing their own page.
     * Otherwise returns only published videos in newest-published order (cached per page).
     *
     * @return LengthAwarePaginator<Video>
     */
    public function listVideos(User $channel, bool $includeAllStatuses = false, int $page = 1): LengthAwarePaginator
    {
        $query = $channel->videos()->with('channel');

        if ($includeAllStatuses) {
            return $query->latest()->paginate(PaginationSize::CHANNEL_VIDEOS);
        }

        return $this->cache->rememberChannelVideos(
            $channel->uuid,
            $page,
            fn () => $query->published()->newestPublished()->paginate(
                perPage: PaginationSize::VIDEO_LIST,
                page: $page,
            ),
        );
    }

    /**
     * Emits ChannelSubscribed / ChannelUnsubscribed for the analytics pipeline.
     *
     * @throws ModelNotFoundException
     */
    public function toggleSubscription(User $subscriber, string $uuid): void
    {
        $channel = User::query()->byUuid($uuid)->firstOrFail();

        DB::transaction(function () use ($subscriber, $channel) {
            $outcome = ToggleGuard::run(
                delete: fn (): int => UserSubscription::query()
                    ->fromUserToChannel($subscriber->id, $channel->id)
                    ->delete(),
                insert: fn (): int => UserSubscription::query()->insertOrIgnore([
                    'user_id' => $subscriber->id,
                    'channel_id' => $channel->id,
                ]),
            );

            if ($outcome === ToggleOutcome::Removed) {
                event(new ChannelUnsubscribed($subscriber, $channel));
            }

            if ($outcome === ToggleOutcome::Applied) {
                event(new ChannelSubscribed($subscriber, $channel));
            }
        });
    }
}

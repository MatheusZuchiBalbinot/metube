<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\CreatePlaylistDTO;
use App\DTOs\ReorderPlaylistVideosDTO;
use App\DTOs\UpdatePlaylistDTO;
use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * PlaylistService — Business logic for playlists.
 *
 * Responsible for:
 * - CRUD operations on playlists
 * - Managing playlist videos
 * - Reordering videos in playlists
 */
final class PlaylistService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * @return Collection<int, Playlist>
     */
    public function getUserPlaylists(User $user): Collection
    {
        return $this->cache->rememberUserPlaylists(
            $user->id,
            fn () => $user->playlists()->with('videos')->get(),
        );
    }

    public function createPlaylist(User $user, CreatePlaylistDTO $data): Playlist
    {
        return DB::transaction(function () use ($user, $data) {
            $payload = [
                'name' => $data->name,
            ];

            return $user->playlists()->create($payload);
        });
    }

    /**
     * Renames the playlist — currently the only mutable field.
     */
    public function updatePlaylist(Playlist $playlist, UpdatePlaylistDTO $data): Playlist
    {
        return DB::transaction(function () use ($playlist, $data) {
            $updateData = [
                'name' => $data->name,
            ];
            $playlist->update($updateData);

            return $playlist;
        });
    }

    /**
     * Permanent delete — no soft-delete.
     */
    public function deletePlaylist(Playlist $playlist): void
    {
        DB::transaction(function () use ($playlist) {
            $playlist->delete();
        });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Video>
     */
    public function getPlaylistVideos(Playlist $playlist): \Illuminate\Database\Eloquent\Collection
    {
        return $playlist->videos()->with('channel')->get();
    }

    /**
     * Idempotent — adding an already-present video is a no-op.
     *
     * Only videos the playlist owner may view (VideoPolicy::view) can be
     * added, otherwise a leaked vuid could pin another user's private video
     * into a playlist and expose its metadata indefinitely. Treated as 404
     * rather than 403 so this doesn't leak the existence of private videos.
     *
     * @throws ModelNotFoundException
     */
    public function addVideoToPlaylist(Playlist $playlist, string $vuid): Playlist
    {
        return DB::transaction(function () use ($playlist, $vuid) {
            $video = Video::query()->byVuid($vuid)->firstOrFail();

            if (Gate::forUser($playlist->user()->firstOrFail())->denies('view', $video)) {
                throw (new ModelNotFoundException())->setModel(Video::class, [$vuid]);
            }

            $playlist->videos()->syncWithoutDetaching($video->id);
            $playlist->touch();

            return $playlist->load(['videos' => fn ($q) => $q->orderByPivot('position')]);
        });
    }

    /**
     * @throws ModelNotFoundException
     */
    public function removeVideoFromPlaylist(Playlist $playlist, string $vuid): void
    {
        DB::transaction(function () use ($playlist, $vuid) {
            $video = Video::query()->byVuid($vuid)->firstOrFail();

            $playlist->videos()->detach($video->id);
            $playlist->touch();
        });
    }

    /**
     * The submitted vuids must match the playlist's current video set exactly:
     * every video already in the playlist must be present, with no extra or
     * duplicated vuids. A partial or mismatched list is rejected before the
     * UPDATE so positions never become stale or duplicated.
     *
     * @throws ModelNotFoundException When a vuid does not exist or does not match the playlist's exact video set
     */
    public function reorderPlaylistVideos(Playlist $playlist, ReorderPlaylistVideosDTO $data): Playlist
    {
        return DB::transaction(function () use ($playlist, $data) {
            /** @var list<string> $playlistVuids */
            $playlistVuids = $playlist->videos()->pluck('vuid')->all();

            if ($data->vuids === []) {
                if ($playlistVuids !== []) {
                    throw (new ModelNotFoundException())
                        ->setModel(Video::class, $playlistVuids);
                }

                return $playlist->load(['videos' => fn ($q) => $q->orderByPivot('position')]);
            }

            /** @var array<string, int> $idByVuid */
            $idByVuid = Video::whereIn('vuid', $data->vuids)->pluck('id', 'vuid')->all();

            $missing = array_diff($data->vuids, array_keys($idByVuid));

            if ($missing !== []) {
                throw (new ModelNotFoundException())
                    ->setModel(Video::class, array_values($missing));
            }

            $hasDuplicates = count($data->vuids) !== count(array_unique($data->vuids));
            $extraVuids = array_diff($data->vuids, $playlistVuids);
            $absentVuids = array_diff($playlistVuids, $data->vuids);
            $isExactPlaylistSet = !$hasDuplicates && $extraVuids === [] && $absentVuids === [];

            if (!$isExactPlaylistSet) {
                throw (new ModelNotFoundException())
                    ->setModel(Video::class, array_merge($extraVuids, $absentVuids));
            }

            $this->applyPositions($playlist->id, $idByVuid, $data->vuids);
            $playlist->touch();

            return $playlist->load(['videos' => fn ($q) => $q->orderByPivot('position')]);
        });
    }

    /**
     * Single CASE-WHEN UPDATE instead of N separate per-row updates.
     *
     * @param array<string, int> $idByVuid Map of vuid => video id
     * @param list<string> $vuids Vuids in their target order
     */
    private function applyPositions(int $playlistId, array $idByVuid, array $vuids): void
    {
        $cases = [];
        $bindings = [];
        $videoIds = [];

        foreach ($vuids as $position => $vuid) {
            $videoId = $idByVuid[$vuid];
            $cases[] = 'WHEN ? THEN CAST(? AS INTEGER)';
            $bindings[] = $videoId;
            $bindings[] = $position;
            $videoIds[] = $videoId;
        }

        $placeholders = implode(',', array_fill(0, count($videoIds), '?'));
        $sql = 'UPDATE playlist_video SET position = CASE video_id '
            . implode(' ', $cases)
            . " END WHERE playlist_id = ? AND video_id IN ({$placeholders})";

        $bindings[] = $playlistId;

        foreach ($videoIds as $videoId) {
            $bindings[] = $videoId;
        }

        DB::update($sql, $bindings);
    }
}

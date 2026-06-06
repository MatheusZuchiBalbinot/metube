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
     * Get all playlists for a user.
     *
     * @return Collection<int, Playlist>
     */
    public function getUserPlaylists(User $user): Collection
    {
        return $this->cache->rememberUserPlaylists(
            $user->id,
            fn () => $user->playlists()->with('videos')->get(),
        );
    }

    /**
     * Create a new playlist.
     *
     * @param User $user Playlist owner
     * @param CreatePlaylistDTO $data Playlist data
     *
     * @return Playlist Created playlist
     */
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
     * Update a playlist (rename).
     *
     * @param UpdatePlaylistDTO $data Playlist data
     *
     * @return Playlist Updated playlist
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
     * Delete a playlist permanently.
     */
    public function deletePlaylist(Playlist $playlist): void
    {
        DB::transaction(function () use ($playlist) {
            $playlist->delete();
        });
    }

    /**
     * Get the ordered videos for a playlist, with channel eager-loaded.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, Video>
     */
    public function getPlaylistVideos(Playlist $playlist): \Illuminate\Database\Eloquent\Collection
    {
        return $playlist->videos()->with('channel')->get();
    }

    /**
     * Add a video to a playlist (idempotent).
     *
     * @param string $vuid Video UUID
     *
     * @throws ModelNotFoundException
     *
     * @return Playlist Updated playlist
     */
    public function addVideoToPlaylist(Playlist $playlist, string $vuid): Playlist
    {
        return DB::transaction(function () use ($playlist, $vuid) {
            $video = Video::byVuid($vuid)->firstOrFail();

            $playlist->videos()->syncWithoutDetaching($video->id);
            $playlist->touch();

            return $playlist->load(['videos' => fn ($q) => $q->orderByPivot('position')]);
        });
    }

    /**
     * Remove a video from a playlist.
     *
     * @param string $vuid Video UUID
     *
     * @throws ModelNotFoundException
     */
    public function removeVideoFromPlaylist(Playlist $playlist, string $vuid): void
    {
        DB::transaction(function () use ($playlist, $vuid) {
            $video = Video::byVuid($vuid)->firstOrFail();

            $playlist->videos()->detach($video->id);
            $playlist->touch();
        });
    }

    /**
     * Reorder videos in a playlist using drag-and-drop.
     *
     * @param ReorderPlaylistVideosDTO $data Reorder data containing ordered video UUIDs
     *
     * @throws ModelNotFoundException
     *
     * @return Playlist Reordered playlist
     */
    public function reorderPlaylistVideos(Playlist $playlist, ReorderPlaylistVideosDTO $data): Playlist
    {
        return DB::transaction(function () use ($playlist, $data) {
            if ($data->vuids === []) {
                return $playlist->load(['videos' => fn ($q) => $q->orderByPivot('position')]);
            }

            /** @var array<string, int> $idByVuid */
            $idByVuid = Video::whereIn('vuid', $data->vuids)->pluck('id', 'vuid')->all();

            $missing = array_diff($data->vuids, array_keys($idByVuid));

            if ($missing !== []) {
                throw (new ModelNotFoundException())
                    ->setModel(Video::class, array_values($missing));
            }

            // One UPDATE using CASE WHEN, instead of N separate updates.
            $cases = [];
            $bindings = [];
            $videoIds = [];

            foreach ($data->vuids as $position => $vuid) {
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

            $bindings[] = $playlist->id;

            foreach ($videoIds as $videoId) {
                $bindings[] = $videoId;
            }

            DB::update($sql, $bindings);
            $playlist->touch();

            return $playlist->load(['videos' => fn ($q) => $q->orderByPivot('position')]);
        });
    }
}

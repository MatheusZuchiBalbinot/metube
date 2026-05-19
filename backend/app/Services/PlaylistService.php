<?php

namespace App\Services;

use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;
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
class PlaylistService
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
     * @param  User  $user  Playlist owner
     * @param  string  $name  Playlist name
     * @return Playlist Created playlist
     */
    public function createPlaylist(User $user, string $name): Playlist
    {
        return DB::transaction(function () use ($user, $name) {
            return $user->playlists()->create(['name' => $name]);
        });
    }

    /**
     * Get a specific playlist with all videos.
     *
     * @param  string  $puid  Playlist UUID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function getPlaylistByPuid(string $puid): Playlist
    {
        return Playlist::where('puid', $puid)
            ->with(['videos' => fn ($q) => $q->orderByPivot('position')])
            ->firstOrFail();
    }

    /**
     * Update a playlist (rename).
     *
     * @param  string  $name  New name
     * @return Playlist Updated playlist
     */
    public function updatePlaylist(Playlist $playlist, string $name): Playlist
    {
        return DB::transaction(function () use ($playlist, $name) {
            $playlist->update(['name' => $name]);

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
     * Add a video to a playlist (idempotent).
     *
     * @param  string  $vuid  Video UUID
     * @return Playlist Updated playlist
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function addVideoToPlaylist(Playlist $playlist, string $vuid): Playlist
    {
        return DB::transaction(function () use ($playlist, $vuid) {
            $video = Video::where('vuid', $vuid)->firstOrFail();

            $playlist->videos()->syncWithoutDetaching($video->id);
            $playlist->touch();

            return $playlist->load(['videos' => fn ($q) => $q->orderByPivot('position')]);
        });
    }

    /**
     * Remove a video from a playlist.
     *
     * @param  string  $vuid  Video UUID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function removeVideoFromPlaylist(Playlist $playlist, string $vuid): void
    {
        DB::transaction(function () use ($playlist, $vuid) {
            $video = Video::where('vuid', $vuid)->firstOrFail();

            $playlist->videos()->detach($video->id);
            $playlist->touch();
        });
    }

    /**
     * Reorder videos in a playlist using drag-and-drop.
     *
     * @param  list<string>  $vuids  Ordered video UUIDs
     * @return Playlist Reordered playlist
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function reorderPlaylistVideos(Playlist $playlist, array $vuids): Playlist
    {
        return DB::transaction(function () use ($playlist, $vuids) {
            if ($vuids === []) {
                return $playlist->load(['videos' => fn ($q) => $q->orderByPivot('position')]);
            }

            /** @var array<string, int> $idByVuid */
            $idByVuid = Video::whereIn('vuid', $vuids)->pluck('id', 'vuid')->all();

            $missing = array_diff($vuids, array_keys($idByVuid));
            if ($missing !== []) {
                throw (new \Illuminate\Database\Eloquent\ModelNotFoundException)
                    ->setModel(Video::class, array_values($missing));
            }

            // One UPDATE using CASE WHEN, instead of N separate updates.
            $cases = [];
            $bindings = [];
            $videoIds = [];

            foreach ($vuids as $position => $vuid) {
                $videoId = $idByVuid[$vuid];
                $cases[] = 'WHEN ? THEN ?';
                $bindings[] = $videoId;
                $bindings[] = $position;
                $videoIds[] = $videoId;
            }

            $placeholders = implode(',', array_fill(0, count($videoIds), '?'));
            $sql = 'UPDATE playlist_video SET position = CASE video_id '
                .implode(' ', $cases)
                ." END WHERE playlist_id = ? AND video_id IN ({$placeholders})";

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

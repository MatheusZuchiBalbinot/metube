<?php

namespace App\Services;

use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;
use Illuminate\Database\Eloquent\Collection;
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
    /**
     * Get all playlists for a user.
     *
     * @return Collection<Playlist>
     */
    public function getUserPlaylists(User $user): Collection
    {
        return $user->playlists()->with('videos')->get();
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
            $position = 0;

            foreach ($vuids as $vuid) {
                $video = Video::where('vuid', $vuid)->firstOrFail();
                $playlist->videos()->updateExistingPivot($video->id, ['position' => $position++]);
            }

            return $playlist->load(['videos' => fn ($q) => $q->orderByPivot('position')]);
        });
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\Playlist\AddVideoRequest;
use App\Http\Requests\Playlist\ReorderVideosRequest;
use App\Http\Requests\Playlist\StorePlaylistRequest;
use App\Http\Requests\Playlist\UpdatePlaylistRequest;
use App\Http\Resources\PlaylistResource;
use App\Services\PlaylistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * PlaylistController — Routes playlist HTTP requests to services.
 *
 * Responsibility: Parse input, authorize, call service, format response.
 */
class PlaylistController extends Controller
{
    public function __construct(private readonly PlaylistService $playlistService) {}

    /**
     * List all playlists for the authenticated user.
     */
    public function index(): JsonResponse
    {
        $playlists = $this->playlistService->getUserPlaylists(auth()->user());

        return $this->json(PlaylistResource::collection($playlists));
    }

    /**
     * Create a new playlist.
     *
     * @param  StorePlaylistRequest  $request  Validated playlist data
     */
    public function store(StorePlaylistRequest $request): JsonResponse
    {
        $playlist = $this->playlistService->createPlaylist(
            auth()->user(),
            $request->validated()['name']
        );

        return $this->json(new PlaylistResource($playlist->load('videos')), 201);
    }

    /**
     * Get a specific playlist with all its videos.
     *
     * @param  string  $puid  Playlist ULID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function show(string $puid): JsonResponse
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);
        $this->authorize('view', $playlist);

        return $this->json(new PlaylistResource($playlist));
    }

    /**
     * Update a playlist (rename).
     *
     * @param  UpdatePlaylistRequest  $request  Validated playlist data
     * @param  string  $puid  Playlist ULID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function update(UpdatePlaylistRequest $request, string $puid): JsonResponse
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);
        $this->authorize('update', $playlist);

        $updated = $this->playlistService->updatePlaylist(
            $playlist,
            $request->validated()['name']
        );

        return $this->json(new PlaylistResource($updated));
    }

    /**
     * Delete a playlist permanently.
     *
     * @param  string  $puid  Playlist ULID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function destroy(string $puid): Response
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);
        $this->authorize('delete', $playlist);

        $this->playlistService->deletePlaylist($playlist);

        return $this->noContent();
    }

    /**
     * Add a video to a playlist.
     *
     * @param  AddVideoRequest  $request  Validated video ULID
     * @param  string  $puid  Playlist ULID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function addVideo(AddVideoRequest $request, string $puid): JsonResponse
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);
        $this->authorize('addVideo', $playlist);

        $updated = $this->playlistService->addVideoToPlaylist(
            $playlist,
            $request->validated()['vuid']
        );

        return $this->json(new PlaylistResource($updated));
    }

    /**
     * Remove a video from a playlist.
     *
     * @param  string  $puid  Playlist ULID
     * @param  string  $vuid  Video ULID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function removeVideo(string $puid, string $vuid): Response
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);
        $this->authorize('removeVideo', $playlist);

        $this->playlistService->removeVideoFromPlaylist($playlist, $vuid);

        return $this->noContent();
    }

    /**
     * Reorder videos in a playlist using drag-and-drop.
     *
     * @param  ReorderVideosRequest  $request  Ordered video ULIDs
     * @param  string  $puid  Playlist ULID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function reorderVideos(ReorderVideosRequest $request, string $puid): JsonResponse
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);
        $this->authorize('reorderVideos', $playlist);

        $updated = $this->playlistService->reorderPlaylistVideos(
            $playlist,
            $request->validated()['vuids']
        );

        return $this->json(new PlaylistResource($updated));
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\Playlist\AddVideoRequest;
use App\Http\Requests\Playlist\ReorderVideosRequest;
use App\Http\Requests\Playlist\StorePlaylistRequest;
use App\Http\Requests\Playlist\UpdatePlaylistRequest;
use App\Models\Playlist;
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
     *
     * @return JsonResponse array{data: Playlist[], meta: {total: int}}
     */
    public function index(): JsonResponse
    {
        $playlists = $this->playlistService->getUserPlaylists(auth()->user());

        return $this->json($playlists);
    }

    /**
     * Create a new playlist.
     *
     * @param  StorePlaylistRequest  $request  Validated playlist data
     * @return JsonResponse Created playlist with $puid
     */
    public function store(StorePlaylistRequest $request): JsonResponse
    {
        $playlist = $this->playlistService->createPlaylist(
            auth()->user(),
            $request->validated()['name']
        );

        return $this->json($playlist);
    }

    /**
     * Get a specific playlist with all its videos.
     *
     * @param  string  $puid  Playlist UUID (v4)
     * @return JsonResponse Playlist with videos array
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function show(string $puid): JsonResponse
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);


        return $this->json($playlist);
    }

    /**
     * Update a playlist (rename).
     *
     * @param  UpdatePlaylistRequest  $request  Validated playlist data
     * @param  string  $puid  Playlist UUID (v4)
     * @return JsonResponse Updated playlist
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function update(UpdatePlaylistRequest $request, string $puid): JsonResponse
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);


        $updated = $this->playlistService->updatePlaylist(
            $playlist,
            $request->validated()['name']
        );

        return $this->json($updated);
    }

    /**
     * Delete a playlist permanently.
     *
     * @param  string  $puid  Playlist UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function destroy(string $puid): Response
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);


        $this->playlistService->deletePlaylist($playlist);

        return $this->noContent();
    }

    /**
     * Add a video to a playlist.
     *
     * @param  AddVideoRequest  $request  Validated video UUID
     * @param  string  $puid  Playlist UUID (v4)
     * @return JsonResponse Updated playlist
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function addVideo(AddVideoRequest $request, string $puid): JsonResponse
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);


        $updated = $this->playlistService->addVideoToPlaylist(
            $playlist,
            $request->validated()['vuid']
        );

        return $this->json($updated);
    }

    /**
     * Remove a video from a playlist.
     *
     * @param  string  $puid  Playlist UUID (v4)
     * @param  string  $vuid  Video UUID (v4)
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function removeVideo(string $puid, string $vuid): Response
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);


        $this->playlistService->removeVideoFromPlaylist($playlist, $vuid);

        return $this->noContent();
    }

    /**
     * Reorder videos in a playlist using drag-and-drop.
     *
     * @param  ReorderVideosRequest  $request  Ordered video UUIDs
     * @param  string  $puid  Playlist UUID (v4)
     * @return JsonResponse Updated playlist in new order
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function reorderVideos(ReorderVideosRequest $request, string $puid): JsonResponse
    {
        $playlist = $this->playlistService->getPlaylistByPuid($puid);


        $updated = $this->playlistService->reorderPlaylistVideos(
            $playlist,
            $request->validated()['vuids']
        );

        return $this->json($updated);
    }
}

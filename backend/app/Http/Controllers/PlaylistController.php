<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Playlist\AddVideoRequest;
use App\Http\Requests\Playlist\ReorderVideosRequest;
use App\Http\Requests\Playlist\StorePlaylistRequest;
use App\Http\Requests\Playlist\UpdatePlaylistRequest;
use App\Http\Resources\PlaylistResource;
use App\Http\Resources\VideoResource;
use App\Models\Playlist;
use App\Services\PlaylistService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * PlaylistController — Routes playlist HTTP requests to services.
 *
 * Responsibility: Parse input, call service, format response.
 * Authorization is enforced by route ->can() middleware in api.php.
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
     */
    public function store(StorePlaylistRequest $request): JsonResponse
    {
        $playlist = $this->playlistService->createPlaylist(
            auth()->user(),
            $request->getDTO(),
        );

        return $this->json(new PlaylistResource($playlist->load('videos')), 201);
    }

    /**
     * Get a specific playlist with all its videos.
     *
     * @throws ModelNotFoundException
     */
    public function show(Playlist $playlist): JsonResponse
    {
        return $this->json(new PlaylistResource($playlist));
    }

    /**
     * List all videos in a playlist, ordered by position.
     *
     * @throws ModelNotFoundException
     */
    public function listVideos(Playlist $playlist): JsonResponse
    {
        $videos = $this->playlistService->getPlaylistVideos($playlist);

        return $this->json(VideoResource::collection($videos));
    }

    /**
     * Update a playlist (rename).
     *
     * @throws ModelNotFoundException
     */
    public function update(UpdatePlaylistRequest $request, Playlist $playlist): JsonResponse
    {
        $updated = $this->playlistService->updatePlaylist($playlist, $request->getDTO());

        return $this->json(new PlaylistResource($updated));
    }

    /**
     * Delete a playlist permanently.
     *
     * @throws ModelNotFoundException
     */
    public function destroy(Playlist $playlist): Response
    {
        $this->playlistService->deletePlaylist($playlist);

        return $this->noContent();
    }

    /**
     * Add a video to a playlist.
     *
     * @throws ModelNotFoundException
     */
    public function addVideo(AddVideoRequest $request, Playlist $playlist): JsonResponse
    {
        $updated = $this->playlistService->addVideoToPlaylist(
            $playlist,
            $request->validated()['vuid'],
        );

        return $this->json(new PlaylistResource($updated));
    }

    /**
     * Remove a video from a playlist.
     *
     * @throws ModelNotFoundException
     */
    public function removeVideo(Playlist $playlist, string $vuid): Response
    {
        $this->playlistService->removeVideoFromPlaylist($playlist, $vuid);

        return $this->noContent();
    }

    /**
     * Reorder videos in a playlist using drag-and-drop.
     *
     * @throws ModelNotFoundException
     */
    public function reorderVideos(ReorderVideosRequest $request, Playlist $playlist): JsonResponse
    {
        $updated = $this->playlistService->reorderPlaylistVideos(
            $playlist,
            $request->getDTO(),
        );

        return $this->json(new PlaylistResource($updated));
    }
}

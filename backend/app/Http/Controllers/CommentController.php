<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\ToggleLikeResultDTO;
use App\Http\Requests\Comment\StoreCommentRequest;
use App\Http\Requests\Comment\UpdateCommentRequest;
use App\Http\Resources\CommentResource;
use App\Http\Resources\CommentVersionResource;
use App\Http\Resources\ToggleLikeResource;
use App\Models\Comment;
use App\Models\Video;
use App\Services\CommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CommentController extends Controller
{
    public function __construct(private readonly CommentService $commentService) {}

    /**
     * List paginated top-level comments for a video.
     *
     * @param string $vuid Public video identifier
     * @param Request $request Incoming HTTP request
     */
    public function index(string $vuid, Request $request): JsonResponse
    {
        $this->authorize('view', Video::query()->byVuid($vuid)->firstOrFail());

        $page = (int) $request->query('page', '1');
        $user = $request->user();
        $comments = $this->commentService->list($vuid, $user, $page);

        return $this->json(CommentResource::collection($comments));
    }

    /**
     * Store a new comment on a video.
     *
     * @param string $vuid Public video identifier
     * @param StoreCommentRequest $request Validated request
     */
    public function store(string $vuid, StoreCommentRequest $request): JsonResponse
    {
        $this->authorize('view', Video::query()->byVuid($vuid)->firstOrFail());

        $user = $request->user();
        $comment = $this->commentService->store($vuid, $request->getDTO(), $user);

        return $this->json(new CommentResource($comment), 201);
    }

    /**
     * Update the content of an existing comment.
     *
     * @param Comment $comment Resolved via cuid route key
     * @param UpdateCommentRequest $request Validated request
     */
    public function update(Comment $comment, UpdateCommentRequest $request): JsonResponse
    {
        $updated = $this->commentService->update($comment, $request->getDTO(), $request->user());

        return $this->json(new CommentResource($updated));
    }

    /**
     * Delete a comment.
     *
     * @param Comment $comment Resolved via cuid route key
     */
    public function destroy(Comment $comment): Response
    {
        $this->commentService->destroy($comment);

        return $this->noContent();
    }

    /**
     * Toggle a like on a comment for the authenticated user.
     *
     * @param Comment $comment Resolved via cuid route key
     * @param Request $request Incoming HTTP request
     */
    public function toggleLike(Comment $comment, Request $request): JsonResponse
    {
        $user = $request->user();
        $result = $this->commentService->toggleLike($comment, $user);

        $dto = new ToggleLikeResultDTO(
            liked: $result['liked'],
            likesCount: $result['likes_count'],
        );

        return $this->json(new ToggleLikeResource($dto));
    }

    /**
     * List all replies for a comment.
     *
     * @param Comment $comment Resolved via cuid route key
     * @param Request $request Incoming HTTP request
     */
    public function replies(Comment $comment, Request $request): JsonResponse
    {
        $user = $request->user();
        $replies = $this->commentService->replies($comment, $user);

        return $this->json(CommentResource::collection($replies));
    }

    /**
     * List all saved versions of a comment, newest first.
     *
     * @param Comment $comment Resolved via cuid route key
     */
    public function versions(Comment $comment): JsonResponse
    {
        $versions = $this->commentService->versions($comment);

        return $this->json(CommentVersionResource::collection($versions));
    }
}

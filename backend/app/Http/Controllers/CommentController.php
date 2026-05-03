<?php

namespace App\Http\Controllers;

use App\Http\Requests\Comment\StoreCommentRequest;
use App\Http\Requests\Comment\UpdateCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
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
     * @param  string  $vuid  Public video identifier
     * @param  Request  $request  Incoming HTTP request
     */
    public function index(string $vuid, Request $request): JsonResponse
    {
        $page = (int) $request->query('page', '1');
        $user = $request->user();
        $comments = $this->commentService->list($vuid, $user, $page);

        return $this->json(CommentResource::collection($comments));
    }

    /**
     * Store a new comment on a video.
     *
     * @param  string  $vuid  Public video identifier
     * @param  StoreCommentRequest  $request  Validated request
     */
    public function store(string $vuid, StoreCommentRequest $request): JsonResponse
    {
        $user = $request->user();
        $comment = $this->commentService->store($vuid, $request, $user);

        return $this->json(new CommentResource($comment), 201);
    }

    /**
     * Update the content of an existing comment.
     *
     * @param  string  $cuid  Public comment identifier
     * @param  UpdateCommentRequest  $request  Validated request
     */
    public function update(string $cuid, UpdateCommentRequest $request): JsonResponse
    {
        $comment = Comment::where('cuid', $cuid)->firstOrFail();
        $this->authorize('update', $comment);

        $updated = $this->commentService->update($comment, $request);

        return $this->json(new CommentResource($updated));
    }

    /**
     * Delete a comment.
     *
     * @param  string  $cuid  Public comment identifier
     * @param  Request  $request  Incoming HTTP request
     */
    public function destroy(string $cuid, Request $request): Response
    {
        $comment = Comment::where('cuid', $cuid)->firstOrFail();
        $this->authorize('delete', $comment);

        $this->commentService->destroy($comment);

        return $this->noContent();
    }

    /**
     * Toggle a like on a comment for the authenticated user.
     *
     * @param  string  $cuid  Public comment identifier
     * @param  Request  $request  Incoming HTTP request
     */
    public function toggleLike(string $cuid, Request $request): JsonResponse
    {
        $comment = Comment::where('cuid', $cuid)->firstOrFail();
        $user = $request->user();
        $result = $this->commentService->toggleLike($comment, $user);

        return $this->json($result);
    }

    /**
     * List all replies for a comment.
     *
     * @param  string  $cuid  Public comment identifier
     * @param  Request  $request  Incoming HTTP request
     */
    public function replies(string $cuid, Request $request): JsonResponse
    {
        $comment = Comment::where('cuid', $cuid)->firstOrFail();
        $user = $request->user();
        $replies = $this->commentService->replies($comment, $user);

        return $this->json(CommentResource::collection($replies));
    }
}

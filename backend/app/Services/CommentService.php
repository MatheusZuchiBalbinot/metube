<?php

namespace App\Services;

use App\Http\Requests\Comment\StoreCommentRequest;
use App\Http\Requests\Comment\UpdateCommentRequest;
use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection as BaseCollection;
use Illuminate\Support\Facades\DB;

class CommentService
{
    /**
     * List top-level comments for a video, paginated.
     *
     * Attaches is_liked as a virtual attribute resolved in bulk.
     *
     * @param  string  $vuid  Public video identifier
     * @param  User  $user  Authenticated user
     * @param  int  $page  Page number
     */
    public function list(string $vuid, User $user, int $page = 1): LengthAwarePaginator
    {
        $video = Video::where('vuid', $vuid)->firstOrFail();

        $paginator = Comment::with('user')
            ->where('video_id', $video->id)
            ->whereNull('parent_id')
            ->orderByDesc('created_at')
            ->paginate(20, ['*'], 'page', $page);

        $this->attachIsLiked($paginator->getCollection(), $user);

        return $paginator;
    }

    /**
     * Store a new comment on a video.
     *
     * Enforces one-level threading: replies cannot have replies.
     *
     * @param  string  $vuid  Public video identifier
     * @param  StoreCommentRequest  $request  Validated request
     * @param  User  $user  Authenticated user
     * @return Comment Newly created comment with user loaded
     *
     * @throws \Illuminate\Http\Exceptions\HttpResponseException When nesting depth exceeded
     */
    public function store(string $vuid, StoreCommentRequest $request, User $user): Comment
    {
        $video = Video::where('vuid', $vuid)->firstOrFail();
        $validated = $request->validated();

        $parentId = null;

        if (isset($validated['parent_cuid'])) {
            $parent = Comment::where('cuid', $validated['parent_cuid'])->firstOrFail();

            $isNestedReply = $parent->parent_id !== null;

            if ($isNestedReply) {
                throw new HttpResponseException(
                    response()->json(['message' => 'Replies cannot be nested beyond one level.'], 422)
                );
            }

            $parentId = $parent->id;
        }

        return DB::transaction(function () use ($user, $video, $validated, $parentId): Comment {
            $comment = Comment::create([
                'user_id' => $user->id,
                'video_id' => $video->id,
                'parent_id' => $parentId,
                'content' => $validated['content'],
            ]);

            if ($parentId !== null) {
                Comment::where('id', $parentId)->increment('replies_count');
            }

            $comment->load('user');
            $comment->is_liked = false;

            return $comment;
        });
    }

    /**
     * Update an existing comment's content.
     *
     * @param  Comment  $comment  Comment to update
     * @param  UpdateCommentRequest  $request  Validated request
     * @return Comment Updated comment
     */
    public function update(Comment $comment, UpdateCommentRequest $request): Comment
    {
        return DB::transaction(function () use ($comment, $request): Comment {
            $comment->update(['content' => $request->validated('content')]);

            return $comment;
        });
    }

    /**
     * Delete a comment and maintain parent reply counter.
     *
     * @param  Comment  $comment  Comment to delete
     */
    public function destroy(Comment $comment): void
    {
        DB::transaction(function () use ($comment): void {
            $hasParent = $comment->parent_id !== null;

            if ($hasParent) {
                Comment::where('id', $comment->parent_id)->decrement('replies_count');
            }

            $comment->delete();
        });
    }

    /**
     * Toggle a like on a comment for the given user.
     *
     * Returns the new like state and updated count.
     *
     * @param  Comment  $comment  Comment to like/unlike
     * @param  User  $user  Authenticated user
     * @return array{liked: bool, likes_count: int}
     */
    public function toggleLike(Comment $comment, User $user): array
    {
        return DB::transaction(function () use ($comment, $user): array {
            $existingLike = DB::table('comment_likes')
                ->where('user_id', $user->id)
                ->where('comment_id', $comment->id)
                ->first();

            $isCurrentlyLiked = $existingLike !== null;

            if ($isCurrentlyLiked) {
                DB::table('comment_likes')
                    ->where('user_id', $user->id)
                    ->where('comment_id', $comment->id)
                    ->delete();

                Comment::where('id', $comment->id)->decrement('likes_count');
                $comment->refresh();

                return ['liked' => false, 'likes_count' => $comment->likes_count];
            }

            DB::table('comment_likes')->insert([
                'user_id' => $user->id,
                'comment_id' => $comment->id,
                'created_at' => now(),
            ]);

            Comment::where('id', $comment->id)->increment('likes_count');
            $comment->refresh();

            return ['liked' => true, 'likes_count' => $comment->likes_count];
        });
    }

    /**
     * Get all replies for a comment.
     *
     * Attaches is_liked as a virtual attribute resolved in bulk.
     *
     * @param  Comment  $comment  Parent comment
     * @param  User  $user  Authenticated user
     */
    public function replies(Comment $comment, User $user): BaseCollection
    {
        $replies = $comment->replies()->with('user')->orderBy('created_at')->get();

        $this->attachIsLiked($replies, $user);

        return $replies;
    }

    /**
     * Bulk-resolve is_liked for a collection of comments and attach as virtual attribute.
     *
     * @param  BaseCollection<int, mixed>  $comments
     */
    private function attachIsLiked(BaseCollection $comments, User $user): void
    {
        $isEmpty = $comments->isEmpty();

        if ($isEmpty) {
            return;
        }

        $commentIds = $comments->pluck('id')->all();

        $likedIds = DB::table('comment_likes')
            ->where('user_id', $user->id)
            ->whereIn('comment_id', $commentIds)
            ->pluck('comment_id')
            ->flip()
            ->all();

        foreach ($comments as $comment) {
            if ($comment instanceof Comment) {
                $comment->is_liked = isset($likedIds[$comment->id]);
            }
        }
    }
}

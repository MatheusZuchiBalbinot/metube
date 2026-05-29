<?php

namespace App\Services;

use App\Events\CommentCreated;
use App\Events\CommentLiked;
use App\Http\Requests\Comment\StoreCommentRequest;
use App\Http\Requests\Comment\UpdateCommentRequest;
use App\Models\Comment;
use App\Models\CommentVersion;
use App\Models\User;
use App\Models\Video;
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
     * @param  User|null  $user  Authenticated user, or null for guests
     * @param  int  $page  Page number
     */
    public function list(string $vuid, ?User $user, int $page = 1): LengthAwarePaginator
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
     * @param  string  $vuid  Public video identifier
     * @param  StoreCommentRequest  $request  Validated request
     * @param  User  $user  Authenticated user
     * @return Comment Newly created comment with user loaded
     */
    public function store(string $vuid, StoreCommentRequest $request, User $user): Comment
    {
        $video = Video::where('vuid', $vuid)->firstOrFail();
        $validated = $request->validated();

        $parentId = null;

        if (isset($validated['parent_cuid'])) {
            $parent = Comment::where('cuid', $validated['parent_cuid'])->firstOrFail();
            $isNestedReply = $parent->parent_id !== null;

            abort_if($isNestedReply, 422, 'Cannot reply to a reply.');

            $parentId = $parent->id;
        }

        $result = DB::transaction(function () use ($user, $video, $validated, $parentId): array {
            $comment = Comment::create([
                'user_id' => $user->id,
                'video_id' => $video->id,
                'parent_id' => $parentId,
                'content' => $validated['content'],
            ]);

            CommentVersion::create([
                'comment_id' => $comment->id,
                'content' => $comment->content,
                'version' => 1,
            ]);

            if ($parentId !== null) {
                Comment::where('id', $parentId)->increment('replies_count');
            }

            // Denormalized counter on videos to avoid COUNT(*) per comment.
            $newCount = DB::table('videos')->where('id', $video->id)->value('comments_count');
            DB::table('videos')->where('id', $video->id)->increment('comments_count');
            $commentCount = (int) $newCount + 1;

            $comment->load('user');

            if ($parentId !== null) {
                $comment->load('parent');
            }

            $comment->is_liked = false;

            return ['comment' => $comment, 'count' => $commentCount];
        });

        $comment = $result['comment'];
        event(new CommentCreated($comment, $user, $video, $result['count']));

        return $comment;
    }

    /**
     * Update an existing comment's content.
     *
     * Saves a new version, marks the comment as edited, and returns the
     * comment with the user relation loaded and is_liked set.
     *
     * @param  Comment  $comment  Comment to update
     * @param  UpdateCommentRequest  $request  Validated request
     * @param  User  $user  Authenticated user (for is_liked resolution)
     * @return Comment Updated comment with user loaded
     */
    public function update(Comment $comment, UpdateCommentRequest $request, User $user): Comment
    {
        return DB::transaction(function () use ($comment, $request, $user): Comment {
            $isLiked = DB::table('comment_likes')
                ->where('user_id', $user->id)
                ->where('comment_id', $comment->id)
                ->exists();

            $nextVersion = $comment->versions()->max('version') + 1;

            $newVersion = CommentVersion::create([
                'comment_id' => $comment->id,
                'content' => $request->validated('content'),
                'version' => $nextVersion,
            ]);

            $comment->content = $request->validated('content');
            $comment->current_version_id = $newVersion->id;
            $comment->save();

            $comment->load('user');
            $comment->is_liked = $isLiked;

            return $comment;
        });
    }

    /**
     * Get all saved versions of a comment, newest first.
     *
     * @param  Comment  $comment  The comment whose versions to retrieve
     */
    public function versions(Comment $comment): BaseCollection
    {
        return $comment->versions()->orderByDesc('version')->get();
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

            DB::table('videos')->where('id', $comment->video_id)->decrement('comments_count');

            $comment->delete();
        });
    }

    /**
     * Toggle a like on a comment for the given user.
     *
     * Uses DELETE-first to avoid the read-then-write race condition: two
     * simultaneous clicks would previously both read "not liked" and both
     * insert, causing a unique violation. Now the first DELETE wins; if it
     * removes a row the request is an unlike, otherwise it's a like.
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
            $unliked = DB::table('comment_likes')
                ->where('user_id', $user->id)
                ->where('comment_id', $comment->id)
                ->delete();

            if ($unliked > 0) {
                Comment::where('id', $comment->id)->decrement('likes_count');
                $comment->refresh();

                return ['liked' => false, 'likes_count' => $comment->likes_count];
            }

            DB::table('comment_likes')->insertOrIgnore([
                'user_id' => $user->id,
                'comment_id' => $comment->id,
                'created_at' => now(),
            ]);

            Comment::where('id', $comment->id)->increment('likes_count');
            $comment->refresh();

            event(new CommentLiked($comment, $user));

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
        $replies = $comment->replies()->with(['user', 'parent'])->orderBy('created_at')->get();

        $this->attachIsLiked($replies, $user);

        return $replies;
    }

    /**
     * Bulk-resolve is_liked for a collection of comments and attach as virtual attribute.
     *
     * Guests (null user) always get is_liked = false.
     *
     * @param  BaseCollection<int, mixed>  $comments
     */
    private function attachIsLiked(BaseCollection $comments, ?User $user): void
    {
        $isEmpty = $comments->isEmpty();

        if ($isEmpty) {
            return;
        }

        if ($user === null) {
            foreach ($comments as $comment) {
                $comment->is_liked = false;
            }

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

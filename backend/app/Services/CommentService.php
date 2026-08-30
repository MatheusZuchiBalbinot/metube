<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\DTOs\StoreCommentDTO;
use App\DTOs\UpdateCommentDTO;
use App\Events\CommentCreated;
use App\Events\CommentLiked;
use App\Models\Comment;
use App\Models\CommentLike;
use App\Models\CommentVersion;
use App\Models\User;
use App\Models\Video;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection as BaseCollection;
use Illuminate\Support\Facades\DB;

final class CommentService
{
    /**
     * Maximum number of comment versions returned by versions().
     *
     * Caps the result to the most recent edits so a comment with an unbounded
     * edit history never loads every version row into memory at once.
     */
    private const MAX_VERSIONS = 100;

    /**
     * Attaches is_liked as a virtual attribute resolved in bulk.
     */
    public function list(string $vuid, ?User $user, int $page = 1): LengthAwarePaginator
    {
        $video = Video::query()->byVuid($vuid)->firstOrFail();

        $paginator = Comment::with('user')
            ->forVideo($video->id)
            ->topLevel()
            ->newest()
            ->paginate(PaginationSize::COMMENT_LIST, ['*'], 'page', $page);

        $this->attachIsLiked($paginator->getCollection(), $user);

        return $paginator;
    }

    /**
     * @return Comment Newly created comment with the user relation loaded
     */
    public function store(string $vuid, StoreCommentDTO $data, User $user): Comment
    {
        $video = Video::query()->byVuid($vuid)->firstOrFail();

        $parentId = null;

        if ($data->parentCuid !== null) {
            $parent = Comment::query()->byCuid($data->parentCuid)->firstOrFail();
            $isNestedReply = $parent->parent_id !== null;

            abort_if($isNestedReply, 422, 'Cannot reply to a reply.');

            $isParentFromAnotherVideo = $parent->video_id !== $video->id;

            abort_if($isParentFromAnotherVideo, 422, 'Cannot reply to a comment from another video.');

            $parentId = $parent->id;
        }

        $result = DB::transaction(function () use ($user, $video, $data, $parentId): array {
            $commentPayload = [
                'user_id' => $user->id,
                'video_id' => $video->id,
                'parent_id' => $parentId,
                'content' => $data->content,
            ];
            $comment = Comment::create($commentPayload);

            $versionPayload = [
                'comment_id' => $comment->id,
                'content' => $comment->content,
                'version' => 1,
            ];

            CommentVersion::create($versionPayload);

            if ($parentId !== null) {
                Comment::where('id', $parentId)->increment('replies_count');
            }

            // Denormalized counter on videos to avoid COUNT(*) per comment.
            $video->increment('comments_count');
            $commentCount = $video->comments_count;

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

    public function update(Comment $comment, UpdateCommentDTO $data, User $user): Comment
    {
        return DB::transaction(function () use ($comment, $data, $user): Comment {
            $isLiked = CommentLike::query()->byUser($user->id)
                ->forComment($comment->id)
                ->exists();

            $nextVersion = $comment->versions()->max('version') + 1;

            $newVersion = CommentVersion::create([
                'comment_id' => $comment->id,
                'content' => $data->content,
                'version' => $nextVersion,
            ]);

            $comment->content = $data->content;
            $comment->current_version_id = $newVersion->id;
            $comment->save();

            $comment->load('user');
            $comment->is_liked = $isLiked;

            return $comment;
        });
    }

    /**
     * The response shape is an unenveloped list, preserving the existing
     * CommentVersionResource contract.
     */
    public function versions(Comment $comment): BaseCollection
    {
        return $comment->versions()->newest()->limit(self::MAX_VERSIONS)->get();
    }

    /**
     * Delete a comment and maintain parent reply counter.
     *
     * A root comment cascades its replies at the DB level (see the comments
     * table migration), so deleting one with N replies removes 1 + N rows.
     * The video's comments_count must be decremented by that same amount, or
     * it drifts upward forever with no reconciliation job to correct it.
     *
     * Deletes via the query builder (not the $comment model instance) so its
     * return value — rows actually removed — gates the decrements. Two requests
     * racing a double-submit delete can both resolve the same $comment before
     * either's DELETE commits; without this guard the second call would still
     * see itself as "1 + replies" and decrement again for a row already gone.
     */
    public function destroy(Comment $comment): void
    {
        DB::transaction(function () use ($comment): void {
            $isRoot = $comment->parent_id === null;
            $replyCount = $isRoot ? $comment->replies()->count() : 0;

            $deleted = Comment::where('id', $comment->id)->delete();

            if ($deleted === 0) {
                return;
            }

            if (!$isRoot) {
                Comment::where('id', $comment->parent_id)->decrement('replies_count');
            }

            $deletedCount = $isRoot ? 1 + $replyCount : 1;

            Video::where('id', $comment->video_id)->decrement('comments_count', $deletedCount);
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
     * @return array{liked: bool, likes_count: int}
     */
    public function toggleLike(Comment $comment, User $user): array
    {
        return DB::transaction(function () use ($comment, $user): array {
            $unliked = CommentLike::query()->byUser($user->id)
                ->forComment($comment->id)
                ->delete();

            if ($unliked > 0) {
                Comment::where('id', $comment->id)->decrement('likes_count');
                $comment->refresh();

                return ['liked' => false, 'likes_count' => $comment->likes_count];
            }

            $inserted = CommentLike::insertOrIgnore([
                'user_id' => $user->id,
                'comment_id' => $comment->id,
                'created_at' => now(),
            ]);

            // Two concurrent clicks can both reach here after both DELETEs above
            // found nothing to remove; the unique constraint on (user_id,
            // comment_id) lets only one INSERT win. Skipping the increment when
            // insertOrIgnore reports 0 rows keeps likes_count from inflating
            // permanently — unlike decrements, an extra increment never self-corrects.
            if ($inserted === 0) {
                return ['liked' => true, 'likes_count' => $comment->likes_count];
            }

            Comment::where('id', $comment->id)->increment('likes_count');
            $comment->refresh();

            event(new CommentLiked($comment, $user));

            return ['liked' => true, 'likes_count' => $comment->likes_count];
        });
    }

    /**
     * Attaches is_liked as a virtual attribute resolved in bulk.
     */
    public function replies(Comment $comment, User $user): BaseCollection
    {
        $replies = $comment->replies()->with(['user', 'parent'])->oldest()->get();

        $this->attachIsLiked($replies, $user);

        return $replies;
    }

    /**
     * @param BaseCollection<int, mixed> $comments
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

        $likedIds = CommentLike::query()->byUser($user->id)
            ->forComments($commentIds)
            ->pluck('comment_id')
            ->flip()
            ->all();

        foreach ($comments as $comment) {
            if (!($comment instanceof Comment)) {
                continue;
            }

            $comment->is_liked = isset($likedIds[$comment->id]);
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $cuid
 * @property int $user_id
 * @property int $video_id
 * @property int|null $parent_id
 * @property string $content
 * @property int $likes_count
 * @property int $replies_count
 * @property int|null $current_version_id
 * @property bool $is_edited Computed: true when current_version_id is not null
 * @property bool $is_liked Virtual attribute set at query time; not persisted
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property User $user
 * @property Video $video
 * @property Comment|null $parent
 * @property CommentVersion|null $currentVersion
 */
class Comment extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'video_id',
        'parent_id',
        'content',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'likes_count' => 'integer',
            'replies_count' => 'integer',
            'current_version_id' => 'integer',
        ];
    }

    /**
     * A comment is considered edited when it has a current_version_id set.
     */
    public function isEdited(): Attribute
    {
        return Attribute::get(fn (): bool => $this->current_version_id !== null);
    }

    public function getRouteKeyName(): string
    {
        return 'cuid';
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Comment $comment): void {
            $comment->cuid ??= Str::random(11);
        });
    }

    /**
     * Get the author of this comment.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the video this comment belongs to.
     *
     * @return BelongsTo<Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * Get the parent comment (null for top-level comments).
     *
     * @return BelongsTo<Comment, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Get the direct replies to this comment.
     *
     * @return HasMany<Comment, $this>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * Get the users who liked this comment.
     *
     * @return BelongsToMany<User, $this>
     */
    public function likes(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'comment_likes')->withTimestamps();
    }

    /**
     * Get all saved versions of this comment.
     *
     * @return HasMany<CommentVersion, $this>
     */
    public function versions(): HasMany
    {
        return $this->hasMany(CommentVersion::class);
    }

    /**
     * Get the version that was set as current on the last edit.
     *
     * @return BelongsTo<CommentVersion, $this>
     */
    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(CommentVersion::class, 'current_version_id');
    }

    /**
     * Scope to get only top-level comments (no parent).
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope to get comments for a specific video.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $videoId Video ID
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForVideo($query, $videoId)
    {
        return $query->where('video_id', $videoId);
    }

    /**
     * Filter comment by CUID.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $cuid Comment unique ID
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByCuid($query, $cuid)
    {
        return $query->where('cuid', $cuid);
    }

    /**
     * Scope to get comments by a specific user.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId User ID
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get replies to a specific comment.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $parentId Parent comment ID
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeRepliesTo($query, $parentId)
    {
        return $query->where('parent_id', $parentId);
    }

    /**
     * Order comments by creation date, newest first.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeNewest($query)
    {
        return $query->orderByDesc('created_at');
    }

    /**
     * Order comments by creation date, oldest first.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOldest($query)
    {
        return $query->orderBy('created_at');
    }
}

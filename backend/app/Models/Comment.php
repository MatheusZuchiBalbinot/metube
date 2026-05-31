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
}

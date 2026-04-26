<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $uuid
 * @property string $name
 * @property string $email
 * @property string $password
 * @property string $bio
 * @property string $avatar
 * @property bool $is_verified
 * @property int $session_version
 */
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /** @var list<string> */
    protected $fillable = ['name', 'email', 'password', 'session_version', 'uuid', 'bio', 'avatar'];

    /** @var list<string> */
    protected $hidden = ['password'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (User $user): void {
            $user->uuid ??= (string) Str::ulid();
        });

        static::created(function (User $user): void {
            $user->playlists()->firstOrCreate(['name' => 'Watch Later']);
        });
    }

    /**
     * Get all videos published by this user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Models\Video, $this>
     */
    public function videos(): HasMany
    {
        return $this->hasMany(Video::class, 'channel_id');
    }

    /**
     * Get all playlists created by this user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Models\Playlist, $this>
     */
    public function playlists(): HasMany
    {
        return $this->hasMany(Playlist::class);
    }

    /**
     * Get all watch history entries for this user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Models\WatchHistory, $this>
     */
    public function history(): HasMany
    {
        return $this->hasMany(WatchHistory::class);
    }

    /**
     * Get all video reactions (likes/dislikes) by this user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<\App\Models\Video, $this>
     */
    public function reactions(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'user_video_reactions')
            ->using(UserVideoReaction::class)
            ->withPivot('type');
    }

    /**
     * Get all videos liked by this user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<\App\Models\Video, $this>
     */
    public function likes(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'user_video_reactions')
            ->using(UserVideoReaction::class)
            ->withPivot('type')
            ->wherePivot('type', '=', 'like');
    }

    /**
     * Get all videos disliked by this user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<\App\Models\Video, $this>
     */
    public function dislikes(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'user_video_reactions')
            ->using(UserVideoReaction::class)
            ->withPivot('type')
            ->wherePivot('type', '=', 'dislike');
    }

    /**
     * Get all watch progress entries for this user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Models\VideoProgress, $this>
     */
    public function progress(): HasMany
    {
        return $this->hasMany(VideoProgress::class);
    }

    /**
     * Get all channels this user is subscribed to.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<\App\Models\User, $this>
     */
    public function subscriptions(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_subscriptions', 'user_id', 'channel_id')
            ->using(UserSubscription::class);
    }

    /**
     * Get all users subscribed to this channel.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<\App\Models\User, $this>
     */
    public function subscribers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_subscriptions', 'channel_id', 'user_id')
            ->using(UserSubscription::class);
    }

    /**
     * Get the Watch Later playlist for this user.
     *
     * @return Playlist
     */
    public function getWatchLaterPlaylist(): Playlist
    {
        return $this->playlists()->where('name', 'Watch Later')->firstOrFail();
    }

    /**
     * Filter users by UUID.
     *
     * @param  Builder<self>  $query
     * @param  string  $uuid  User UUID
     * @return Builder<self>
     */
    public function scopeByUuid(Builder $query, string $uuid): Builder
    {
        return $query->where('uuid', $uuid);
    }
}

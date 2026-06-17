<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PlaylistName;
use App\Enums\ReactionType;
use App\Models\Builders\UserBuilder;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Query\Builder as QueryBuilder;
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
class User extends Authenticatable implements MustVerifyEmail
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
            $user->playlists()->firstOrCreate(['name' => PlaylistName::WATCH_LATER->value]);
        });
    }

    /**
     * Get all videos published by this user.
     *
     * @return HasMany<Video, $this>
     */
    public function videos(): HasMany
    {
        return $this->hasMany(Video::class, 'channel_id');
    }

    /**
     * Get all playlists created by this user.
     *
     * @return HasMany<Playlist, $this>
     */
    public function playlists(): HasMany
    {
        return $this->hasMany(Playlist::class);
    }

    /**
     * Get all watch history entries for this user.
     *
     * @return HasMany<WatchHistory, $this>
     */
    public function history(): HasMany
    {
        return $this->hasMany(WatchHistory::class);
    }

    /**
     * Get all video reactions (likes/dislikes) by this user.
     *
     * @return BelongsToMany<Video, $this>
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
     * @return BelongsToMany<Video, $this>
     */
    public function likes(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'user_video_reactions')
            ->using(UserVideoReaction::class)
            ->withPivot('type')
            ->wherePivot('type', '=', ReactionType::LIKE->value);
    }

    /**
     * Get all videos disliked by this user.
     *
     * @return BelongsToMany<Video, $this>
     */
    public function dislikes(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'user_video_reactions')
            ->using(UserVideoReaction::class)
            ->withPivot('type')
            ->wherePivot('type', '=', ReactionType::DISLIKE->value);
    }

    /**
     * Get all watch progress entries for this user.
     *
     * @return HasMany<VideoProgress, $this>
     */
    public function progress(): HasMany
    {
        return $this->hasMany(VideoProgress::class);
    }

    /**
     * Get all channels this user is subscribed to.
     *
     * @return BelongsToMany<User, $this>
     */
    public function subscriptions(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'user_subscriptions', 'user_id', 'channel_id')
            ->using(UserSubscription::class);
    }

    /**
     * Get all users subscribed to this channel.
     *
     * @return BelongsToMany<User, $this>
     */
    public function subscribers(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'user_subscriptions', 'channel_id', 'user_id')
            ->using(UserSubscription::class);
    }

    /**
     * Get the Watch Later playlist for this user.
     */
    public function getWatchLaterPlaylist(): Playlist
    {
        return $this->playlists()->where('name', PlaylistName::WATCH_LATER->value)->firstOrFail();
    }

    /**
     * Override the default reset-password notification to link to the frontend SPA.
     *
     * @param string $token Password reset token
     */
    public function sendPasswordResetNotification(mixed $token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * Create a typed Eloquent builder for this model.
     *
     * @param QueryBuilder $query
     *
     * @return UserBuilder
     */
    public function newEloquentBuilder($query): UserBuilder
    {
        return new UserBuilder($query);
    }

    /**
     * Route broadcast notifications to the same private channel the frontend subscribes to.
     */
    public function receivesBroadcastNotificationsOn(): string
    {
        return "users.{$this->uuid}";
    }
}

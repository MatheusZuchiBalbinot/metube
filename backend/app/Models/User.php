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
     * @return HasMany<Video, $this>
     */
    public function videos(): HasMany
    {
        return $this->hasMany(Video::class, 'channel_id');
    }

    /**
     * @return HasMany<Playlist, $this>
     */
    public function playlists(): HasMany
    {
        return $this->hasMany(Playlist::class);
    }

    /**
     * @return HasMany<WatchHistory, $this>
     */
    public function history(): HasMany
    {
        return $this->hasMany(WatchHistory::class);
    }

    /**
     * @return BelongsToMany<Video, $this>
     */
    public function reactions(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'user_video_reactions')
            ->using(UserVideoReaction::class)
            ->withPivot('type');
    }

    /**
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
     * @return HasMany<VideoProgress, $this>
     */
    public function progress(): HasMany
    {
        return $this->hasMany(VideoProgress::class);
    }

    /**
     * Channels this user follows. Same pivot table as subscribers(), with user_id/channel_id swapped.
     *
     * @return BelongsToMany<User, $this>
     */
    public function subscriptions(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'user_subscriptions', 'user_id', 'channel_id')
            ->using(UserSubscription::class);
    }

    /**
     * Users following this channel. Same pivot table as subscriptions(), with user_id/channel_id swapped.
     *
     * @return BelongsToMany<User, $this>
     */
    public function subscribers(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'user_subscriptions', 'channel_id', 'user_id')
            ->using(UserSubscription::class);
    }

    public function getWatchLaterPlaylist(): Playlist
    {
        return $this->playlists()->where('name', PlaylistName::WATCH_LATER->value)->firstOrFail();
    }

    /**
     * Overrides the default notification to link to the frontend SPA instead of a backend route.
     *
     * @param string $token
     */
    public function sendPasswordResetNotification(mixed $token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * @param QueryBuilder $query
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

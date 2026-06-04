<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $puid
 * @property int $user_id
 * @property string $name
 */
class Playlist extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = ['user_id', 'name'];

    public function getRouteKeyName(): string
    {
        return 'puid';
    }

    /**
     * @param mixed $value
     * @param string|null $field
     */
    public function resolveRouteBinding($value, $field = null): ?self
    {
        return self::byPuid((string) $value)
            ->with(['videos' => fn ($q) => $q->orderByPivot('position')])
            ->first();
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Playlist $playlist): void {
            $playlist->puid ??= (string) Str::ulid();
        });
    }

    /**
     * Get the user who owns this playlist.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all videos in this playlist, ordered by position.
     *
     * @return BelongsToMany<Video, $this>
     */
    public function videos(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'playlist_video')
            ->using(PlaylistVideo::class)
            ->withPivot('position')
            ->orderByPivot('position');
    }

    /**
     * Filter playlist by PUID.
     *
     * @param Builder<Playlist> $query
     * @param string $puid Playlist unique ID
     *
     * @return Builder<Playlist>
     */
    public function scopeByPuid(Builder $query, string $puid): Builder
    {
        return $query->where('puid', $puid);
    }

    /**
     * Filter playlists owned by a specific user.
     *
     * @param Builder<Playlist> $query
     * @param int $userId User ID
     *
     * @return Builder<Playlist>
     */
    public function scopeOfUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Order playlists by creation date, newest first.
     *
     * @param Builder<Playlist> $query
     *
     * @return Builder<Playlist>
     */
    public function scopeNewest(Builder $query): Builder
    {
        return $query->orderByDesc('created_at');
    }

    /**
     * Filter playlists created recently (last N days).
     *
     * @param Builder<Playlist> $query
     * @param int $days Number of days (default 30)
     *
     * @return Builder<Playlist>
     */
    public function scopeRecent(Builder $query, int $days = 30): Builder
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}

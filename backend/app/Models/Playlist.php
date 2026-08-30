<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\PlaylistBuilder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Query\Builder as QueryBuilder;
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
     * @param string|null $field
     */
    public function resolveRouteBinding($value, $field = null): ?self
    {
        return self::query()->byPuid((string) $value)
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
     * @param QueryBuilder $query
     */
    public function newEloquentBuilder($query): PlaylistBuilder
    {
        return new PlaylistBuilder($query);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsToMany<Video, $this>
     */
    public function videos(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'playlist_video')
            ->using(PlaylistVideo::class)
            ->withPivot('position')
            ->orderByPivot('position');
    }
}

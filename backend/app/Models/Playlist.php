<?php

namespace App\Models;

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
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all videos in this playlist, ordered by position.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<\App\Models\Video, $this>
     */
    public function videos(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'playlist_video')
            ->using(PlaylistVideo::class)
            ->withPivot('position')
            ->orderByPivot('position');
    }
}

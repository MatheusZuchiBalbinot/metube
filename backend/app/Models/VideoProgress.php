<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\VideoProgressBuilder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * @property int $id
 * @property int $user_id
 * @property int $video_id
 * @property int $percent
 * @property Video $video
 */
class VideoProgress extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = ['user_id', 'video_id', 'percent'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'percent' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * @param QueryBuilder $query
     */
    public function newEloquentBuilder($query): VideoProgressBuilder
    {
        return new VideoProgressBuilder($query);
    }
}

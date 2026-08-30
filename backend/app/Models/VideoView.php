<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\VideoViewBuilder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $video_id
 * @property string|null $source
 * @property string|null $session_id
 * @property Carbon $watched_at
 */
class VideoView extends Model
{
    /** @var string */
    public $table = 'video_views';

    /** @var bool */
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'video_id', 'source', 'session_id', 'watched_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['watched_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * @param QueryBuilder $query
     */
    public function newEloquentBuilder($query): VideoViewBuilder
    {
        return new VideoViewBuilder($query);
    }
}

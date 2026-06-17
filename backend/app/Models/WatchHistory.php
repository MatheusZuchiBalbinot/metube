<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\WatchHistoryBuilder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $video_id
 * @property float|null $watched_percent
 * @property Carbon $watched_at
 */
class WatchHistory extends Model
{
    use HasFactory;

    /** @var bool */
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'video_id', 'watched_percent', 'watched_at'];

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
     * Create a new typed Eloquent query builder for the model.
     *
     * @param QueryBuilder $query
     *
     * @return WatchHistoryBuilder
     */
    public function newEloquentBuilder($query): WatchHistoryBuilder
    {
        return new WatchHistoryBuilder($query);
    }
}

<?php

namespace App\Models;

use App\Enums\VideoStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $vuid
 * @property int $channel_id
 * @property string $title
 * @property string $description
 * @property array<string> $tags
 * @property \App\Enums\VideoStatus $status
 * @property float|null $duration
 * @property int $views
 * @property string|null $video_url
 * @property string|null $thumbnail_url
 * @property string|null $published_at
 * @property string|null $scheduled_at
 * @property \App\Models\VideoSummary|null $summary
 */
class Video extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'channel_id',
        'title',
        'description',
        'tags',
        'status',
        'duration',
        'views',
        'video_url',
        'thumbnail_url',
        'published_at',
        'scheduled_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'status' => VideoStatus::class,
            'published_at' => 'datetime',
            'scheduled_at' => 'datetime',
            'duration' => 'float',
            'views' => 'integer',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Video $video): void {
            $video->vuid ??= (string) Str::ulid();
        });
    }

    /**
     * Get the user who published this video.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\User, $this>
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'channel_id');
    }

    /**
     * Get the summary for this video (if it exists).
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne<\App\Models\VideoSummary, $this>
     */
    public function summary(): HasOne
    {
        return $this->hasOne(VideoSummary::class);
    }

    /**
     * Get all watch progress entries for this video.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Models\VideoProgress, $this>
     */
    public function progress(): HasMany
    {
        return $this->hasMany(VideoProgress::class);
    }

    /**
     * Get all watch history entries for this video.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Models\WatchHistory, $this>
     */
    public function watchHistory(): HasMany
    {
        return $this->hasMany(WatchHistory::class);
    }

    /**
     * Filter videos by search, tags, and status.
     *
     * @param  Builder<Video>  $query
     * @param  array<string, mixed>  $filters
     * @return Builder<Video>
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if (isset($filters['search'])) {
            $operator = $query->getConnection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query = $query->where('title', $operator, "%{$filters['search']}%");
        }

        if (isset($filters['tags'])) {
            $query = $query->whereJsonContains('tags', $filters['tags']);
        }

        if (isset($filters['status'])) {
            $query = $query->where('status', $filters['status']);
        }

        return $query;
    }

    /**
     * Filter only published videos.
     *
     * @param  Builder<Video>  $query
     * @return Builder<Video>
     */
    public function scopePublished(Builder $query): Builder
    {
        $query->where('status', VideoStatus::PUBLISHED);

        return $query;
    }

    /**
     * Order by publication date, newest first.
     *
     * @param  Builder<Video>  $query
     * @return Builder<Video>
     */
    public function scopeLatest(Builder $query): Builder
    {
        return $query->orderByDesc('published_at');
    }
}

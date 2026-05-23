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
 * @property array<array{lang: string, label: string, url: string}> $captions
 * @property \App\Enums\VideoStatus $status
 * @property float|null $duration
 * @property int $views
 * @property int $comments_count
 * @property string|null $video_url
 * @property string|null $thumbnail_url
 * @property \Illuminate\Support\Carbon|null $published_at
 * @property \Illuminate\Support\Carbon|null $scheduled_at
 * @property bool $is_batch
 * @property \App\Models\VideoSummary|null $summary
 * @property \App\Models\Transcription|null $transcription
 * @property \App\Models\VideoAiSuggestion|null $aiSuggestion
 * @property-read \App\Models\User $channel
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
        'is_batch',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'captions' => 'array',
            'status' => VideoStatus::class,
            'published_at' => 'datetime',
            'scheduled_at' => 'datetime',
            'duration' => 'float',
            'views' => 'integer',
            'comments_count' => 'integer',
            'is_batch' => 'boolean',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Video $video): void {
            $video->vuid ??= Str::random(11);
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
     * Get the transcription for this video (if it exists).
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne<\App\Models\Transcription, $this>
     */
    public function transcription(): HasOne
    {
        return $this->hasOne(Transcription::class);
    }

    /**
     * Get the AI-generated suggestion for this video (if it exists).
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne<\App\Models\VideoAiSuggestion, $this>
     */
    public function aiSuggestion(): HasOne
    {
        return $this->hasOne(VideoAiSuggestion::class);
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
     * On PostgreSQL, search uses a pre-computed tsvector column (GIN-indexed).
     * On other drivers (SQLite in tests), falls back to LIKE.
     * Tag filtering uses OR semantics: any matching tag includes the video.
     *
     * @param  Builder<Video>  $query
     * @param  array<string, mixed>  $filters
     * @return Builder<Video>
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if (isset($filters['search'])) {
            $isPgsql = $query->getConnection()->getDriverName() === 'pgsql';

            if ($isPgsql) {
                $term = str_replace(' ', ' & ', trim($filters['search']));
                $query = $query->whereRaw("search_tsv @@ to_tsquery('simple', ?)", [$term.':*']);
            } else {
                $term = "%{$filters['search']}%";
                $query = $query->where(function (Builder $q) use ($term): void {
                    $q->where('title', 'like', $term)
                        ->orWhere('description', 'like', $term);
                });
            }
        }

        if (isset($filters['tags'])) {
            $tags = array_values($filters['tags']);
            $isPgsql = $query->getConnection()->getDriverName() === 'pgsql';

            if ($isPgsql) {
                $placeholders = implode(',', array_fill(0, count($tags), '?'));
                $query = $query->whereRaw("tags ?| array[{$placeholders}]", $tags);
            } else {
                $query = $query->where(function (Builder $q) use ($tags): void {
                    foreach ($tags as $tag) {
                        $q->orWhereJsonContains('tags', $tag);
                    }
                });
            }
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
     * Named distinctly from Eloquent's native latest() which orders by created_at.
     *
     * @param  Builder<Video>  $query
     * @return Builder<Video>
     */
    public function scopeNewestPublished(Builder $query): Builder
    {
        $query->orderByDesc('published_at');

        return $query;
    }
}

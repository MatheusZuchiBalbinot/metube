<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VideoStatus;
use App\Models\Builders\VideoBuilder;
use App\Models\Concerns\HasPublicId;
use App\Services\CacheService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $vuid
 * @property int $channel_id
 * @property string $title
 * @property string $description
 * @property array<string> $tags
 * @property array<array{lang: string, label: string, url: string}> $captions
 * @property VideoStatus $status
 * @property float|null $duration
 * @property int $views
 * @property int $comments_count
 * @property string|null $video_url
 * @property string|null $hls_url
 * @property string|null $thumbnail_url
 * @property Carbon|null $published_at
 * @property Carbon|null $scheduled_at
 * @property bool $is_batch
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property VideoSummary|null $summary
 * @property Transcription|null $transcription
 * @property VideoAiSuggestion|null $aiSuggestion
 * @property-read User $channel
 */
class Video extends Model
{
    use HasFactory, HasPublicId;

    /** @var list<string> */
    protected $fillable = [
        'channel_id',
        'title',
        'description',
        'tags',
        'captions',
        'status',
        'duration',
        'views',
        'video_url',
        'hls_url',
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

    public function getRouteKeyName(): string
    {
        return 'vuid';
    }

    /**
     * Routed through the video.meta cache (see CacheService::rememberVideoMeta)
     * so the most-hit read path (opening a video, every like/save/progress
     * update) doesn't hit Postgres on every request — that cache existed but
     * was previously only reached via VideoService::getVideoByUuid(), never
     * from route-model-bound controller actions.
     */
    public function resolveRouteBinding($value, $field = null): ?self
    {
        try {
            return app(CacheService::class)->rememberVideoMeta(
                (string) $value,
                fn () => $this->where('vuid', $value)->with('channel')->firstOrFail(),
            );
        } catch (ModelNotFoundException) {
            return null;
        }
    }

    protected function publicIdField(): string
    {
        return 'vuid';
    }

    protected function generatePublicId(): string
    {
        return Str::random(11);
    }

    /**
     * A "channel" is a User — there's no separate Channel model.
     *
     * withCount('subscribers') lives on the relation itself so every load of
     * `channel` carries subscribers_count for VideoResource, not just call
     * sites that remember to ask for it.
     *
     * @return BelongsTo<User, $this>
     */
    public function channel(): BelongsTo
    {
        $relation = $this->belongsTo(User::class, 'channel_id');
        $relation->withCount('subscribers');

        return $relation;
    }

    /**
     * @return HasOne<VideoSummary, $this>
     */
    public function summary(): HasOne
    {
        return $this->hasOne(VideoSummary::class);
    }

    /**
     * @return HasOne<Transcription, $this>
     */
    public function transcription(): HasOne
    {
        return $this->hasOne(Transcription::class);
    }

    /**
     * @return HasOne<VideoAiSuggestion, $this>
     */
    public function aiSuggestion(): HasOne
    {
        return $this->hasOne(VideoAiSuggestion::class);
    }

    /**
     * @return HasMany<VideoProgress, $this>
     */
    public function progress(): HasMany
    {
        return $this->hasMany(VideoProgress::class);
    }

    /**
     * @return HasMany<WatchHistory, $this>
     */
    public function watchHistory(): HasMany
    {
        return $this->hasMany(WatchHistory::class);
    }

    /**
     * @param QueryBuilder $query
     */
    public function newEloquentBuilder($query): VideoBuilder
    {
        return new VideoBuilder($query);
    }

    public function hasEnglishCaptions(): bool
    {
        return \in_array('en', \array_column($this->captions ?? [], 'lang'), true);
    }

    public function appendCaption(string $lang, string $label, string $url): void
    {
        $captions = $this->captions ?? [];
        $captions[] = compact('lang', 'label', 'url');

        $this->update(['captions' => $captions]);
    }

    /**
     * Public-disk-relative directory holding this video's HLS package
     * (master.m3u8, segments and the extracted audio track).
     */
    public function hlsDirectory(): string
    {
        return "hls/{$this->vuid}";
    }

    /**
     * Public-disk-relative path to the audio track extracted during HLS
     * transcoding. This is the input fed to Whisper for transcription/translation.
     */
    public function audioPath(): string
    {
        return "{$this->hlsDirectory()}/audio.m4a";
    }
}

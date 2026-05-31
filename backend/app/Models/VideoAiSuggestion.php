<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AiSuggestionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $video_id
 * @property string|null $suggested_title
 * @property string|null $suggested_description
 * @property list<string> $suggested_tags
 * @property AiSuggestionStatus $status
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 */
class VideoAiSuggestion extends Model
{
    protected $fillable = [
        'video_id',
        'suggested_title',
        'suggested_description',
        'suggested_tags',
        'status',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'suggested_tags' => 'array',
            'status' => AiSuggestionStatus::class,
        ];
    }

    /** @return BelongsTo<Video, $this> */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}

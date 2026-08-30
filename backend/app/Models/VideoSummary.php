<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $video_id
 * @property array<string> $key_points
 * @property array<array{timestamp: string, title: string}> $chapters
 * @property string|null $reading_mode
 */
class VideoSummary extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = ['video_id', 'key_points', 'chapters', 'reading_mode'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'key_points' => 'array',
            'chapters' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}

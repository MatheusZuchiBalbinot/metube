<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $video_id
 * @property int $percent
 * @property \App\Models\Video $video
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
     * Get the user who has this progress.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the video this progress is for.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}

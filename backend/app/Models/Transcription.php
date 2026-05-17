<?php

namespace App\Models;

use App\Enums\TranscriptionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $video_id
 * @property string|null $language
 * @property string|null $content
 * @property TranscriptionStatus $status
 * @property \Illuminate\Support\Carbon|null $started_at
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property-read \App\Models\Video $video
 */
class Transcription extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = ['video_id', 'language', 'content', 'status', 'started_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'status' => TranscriptionStatus::class,
            'started_at' => 'datetime',
        ];
    }

    /**
     * Get the video this transcription belongs to.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * @property int $user_id
 * @property int $video_id
 * @property string $type
 */
class UserVideoReaction extends Pivot
{
    /** @var string */
    public $table = 'user_reactions';

    /** @var bool */
    public $incrementing = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'video_id', 'type'];

    /** @var bool */
    public $timestamps = false;

    /**
     * Get the user who created this reaction.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the video being reacted to.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}

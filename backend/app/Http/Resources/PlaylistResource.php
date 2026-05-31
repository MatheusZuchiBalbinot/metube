<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlaylistResource extends JsonResource
{
    /**
     * Transform the playlist into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'puid' => $this->puid,
            'name' => $this->name,
            'video_ids' => $this->whenLoaded(
                'videos',
                fn () => $this->videos->map(fn ($v) => $v->vuid)->values()->toArray(),
                [],
            ),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

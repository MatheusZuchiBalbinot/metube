<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WatchHistoryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'vuid' => $this->video->vuid,
            'watched_at' => $this->watched_at->toIso8601String(),
        ];
    }
}

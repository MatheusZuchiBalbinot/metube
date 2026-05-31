<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\DTOs\ToggleLikeResultDTO;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ToggleLikeResultDTO */
class ToggleLikeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'liked' => $this->liked,
            'likes_count' => $this->likesCount,
        ];
    }
}

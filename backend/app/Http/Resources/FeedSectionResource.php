<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\DTOs\FeedSection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeedSectionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $section = $this->resource;

        if (!$section instanceof FeedSection) {
            return [];
        }

        return [
            'key' => $section->key->value,
            'label' => $section->label,
            'videos' => VideoResource::collection($section->videos),
        ];
    }
}

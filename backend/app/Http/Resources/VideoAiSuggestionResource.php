<?php

namespace App\Http\Resources;

use App\Models\VideoAiSuggestion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin VideoAiSuggestion */
class VideoAiSuggestionResource extends JsonResource
{
    /**
     * Transform the AI suggestion into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'status' => $this->status->value,
            'suggested_title' => $this->suggested_title,
            'suggested_description' => $this->suggested_description,
            'suggested_tags' => $this->suggested_tags,
        ];
    }
}

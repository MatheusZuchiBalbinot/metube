<?php

namespace App\Http\Resources;

use App\Models\CommentVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/** @mixin CommentVersion */
class CommentVersionResource extends JsonResource
{
    /**
     * Transform the comment version into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'version' => $this->version,
            'content' => $this->content,
            'created_at' => Carbon::parse($this->created_at)->toIso8601String(),
        ];
    }
}

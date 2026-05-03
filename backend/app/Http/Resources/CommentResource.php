<?php

namespace App\Http\Resources;

use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Comment */
class CommentResource extends JsonResource
{
    /**
     * Transform the comment into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'cuid' => $this->cuid,
            'content' => $this->content,
            'likes_count' => $this->likes_count,
            'replies_count' => $this->replies_count,
            'is_liked' => $this->is_liked ?? false,
            'parent_cuid' => $this->whenLoaded('parent', fn () => $this->parent?->cuid, null),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'author' => $this->whenLoaded('user', fn () => [
                'uuid' => $this->user->uuid,
                'name' => $this->user->name,
                'avatar' => $this->user->avatar,
            ]),
        ];
    }
}

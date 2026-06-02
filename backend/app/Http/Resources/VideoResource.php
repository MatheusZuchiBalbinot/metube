<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class VideoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'vuid' => $this->vuid,
            'title' => $this->title,
            'description' => $this->description ?? '',
            'status' => $this->status->value,
            'views' => $this->views,
            'duration' => $this->duration,
            'video_url' => $this->video_url !== null ? Storage::disk('public')->url($this->video_url) : null,
            'hls_url' => $this->hls_url !== null ? Storage::disk('public')->url($this->hls_url) : null,
            'thumbnail_url' => $this->thumbnail_url !== null ? Storage::disk('public')->url($this->thumbnail_url) : null,
            'published_at' => $this->published_at?->toIso8601String(),
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'tags' => $this->tags ?? [],
            'captions' => array_map(
                fn (array $caption): array => [
                    'lang' => $caption['lang'],
                    'label' => $caption['label'],
                    'url' => Storage::disk('public')->url($caption['url']),
                ],
                $this->captions ?? [],
            ),
            'channel' => $this->whenLoaded('channel', fn () => $this->channel->name, ''),
            'channel_id' => $this->whenLoaded('channel', fn () => $this->channel->uuid, ''),
            'channel_subscribers' => $this->whenLoaded('channel', fn () => $this->channel->subscribers_count),
        ];
    }
}

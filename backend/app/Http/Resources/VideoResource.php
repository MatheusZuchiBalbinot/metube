<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Contracts\StorageContract;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
            'video_url' => $this->video_url !== null ? $this->storageUrl($this->video_url) : null,
            'hls_url' => $this->hls_url !== null ? $this->storageUrl($this->hls_url) : null,
            'thumbnail_url' => $this->thumbnail_url !== null ? $this->storageUrl($this->thumbnail_url) : null,
            'published_at' => $this->published_at?->toIso8601String(),
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'tags' => $this->tags ?? [],
            'captions' => array_map(
                fn (array $caption): array => [
                    'lang' => $caption['lang'],
                    'label' => $caption['label'],
                    'url' => $this->storageUrl($caption['url']),
                ],
                $this->captions ?? [],
            ),
            'channel' => $this->whenLoaded('channel', fn () => $this->channel->name, ''),
            'channel_id' => $this->whenLoaded('channel', fn () => $this->channel->uuid, ''),
            'channel_subscribers' => $this->whenLoaded('channel', fn () => $this->channel->subscribers_count),
        ];
    }

    /**
     * Return a root-relative path for a public disk file.
     *
     * Using root-relative paths instead of absolute URLs keeps media requests
     * on the same origin, satisfying the CSP connect-src 'self' directive and
     * routing HLS manifest/segment fetches through the Vite dev proxy.
     *
     * @param string $diskPath Path relative to the public disk
     *
     * @return string Root-relative path, e.g. /storage/hls/{vuid}/master.m3u8
     */
    private function storageUrl(string $diskPath): string
    {
        $absolute = app(StorageContract::class)->publicUrl($diskPath);

        return (string) parse_url($absolute, PHP_URL_PATH);
    }
}

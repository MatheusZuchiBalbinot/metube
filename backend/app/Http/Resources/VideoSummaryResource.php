<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\DTOs\VideoSummaryDTO;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin VideoSummaryDTO */
class VideoSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'key_points' => $this->keyPoints,
            'chapters' => $this->chapters,
            'reading_mode' => $this->readingMode,
        ];
    }
}

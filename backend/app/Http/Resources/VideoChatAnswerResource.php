<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\DTOs\ChatAnswerDTO;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ChatAnswerDTO */
class VideoChatAnswerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'answer' => $this->answer,
        ];
    }
}

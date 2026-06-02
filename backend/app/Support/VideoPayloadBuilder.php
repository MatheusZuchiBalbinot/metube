<?php

declare(strict_types=1);

namespace App\Support;

use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\Enums\VideoStatus;
use App\Models\User;

/**
 * Builds the attribute array for Video::create(), keeping the mapping in a single
 * place so the single-POST and tus finalization paths cannot drift apart.
 *
 * A freshly uploaded video is always persisted with status=PROCESSING regardless
 * of the status carried by the DTO, since processing has not run yet.
 */
final class VideoPayloadBuilder
{
    /**
     * @return array<string, mixed>
     */
    public static function fromCreateDTO(User $user, CreateVideoDTO $data): array
    {
        return [
            'channel_id' => $user->id,
            'title' => $data->title,
            'description' => $data->description,
            'tags' => $data->tags,
            'status' => VideoStatus::PROCESSING,
            'scheduled_at' => $data->scheduledAt,
            'is_batch' => $data->isBatch,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function fromFinalizeDTO(User $user, FinalizeUploadDTO $data): array
    {
        return [
            'channel_id' => $user->id,
            'title' => $data->title,
            'description' => $data->description,
            'tags' => $data->tags,
            'status' => VideoStatus::PROCESSING,
            'scheduled_at' => $data->scheduledAt,
            'is_batch' => $data->isBatch,
        ];
    }
}

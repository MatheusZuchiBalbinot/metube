<?php

declare(strict_types=1);

namespace App\Http\Requests\Video;

use App\Config\MimeTypes;
use App\Config\UploadLimits;
use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\Http\Requests\Concerns\ValidatesVideoMetadata;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Validator;

/**
 * Accepts two mutually exclusive upload modes:
 *   - Direct upload: `video_file` (multipart/form-data) + optional `thumbnail_file`
 *   - Resumable upload: `upload_key` (tus session key) + optional `thumbnail_key`
 *
 * @property string $title
 * @property string|null $description
 * @property list<string> $tags
 * @property string $status
 * @property UploadedFile|null $video_file
 * @property UploadedFile|null $thumbnail_file
 * @property string|null $upload_key
 * @property string|null $thumbnail_key
 * @property string|null $scheduled_at
 * @property bool $is_batch
 */
class StoreVideoRequest extends FormRequest
{
    use ValidatesVideoMetadata;

    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return array_merge($this->videoMetadataRules(required: true), [
            'video_file' => [
                'required_without:upload_key', 'nullable', 'file',
                'mimes:' . implode(',', MimeTypes::VIDEO_MIMES),
                'max:' . UploadLimits::VIDEO_MAX_KB,
            ],
            'thumbnail_file' => [
                'nullable', 'image',
                'mimes:' . implode(',', MimeTypes::IMAGE_MIMES),
                'max:' . UploadLimits::THUMBNAIL_MAX_KB,
            ],
            'upload_key' => ['required_without:video_file', 'nullable', 'string'],
            'thumbnail_key' => ['nullable', 'string'],
            'is_batch' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Video title is required.',
            'video_file.required_without' => 'A video file is required.',
            'video_file.mimes' => 'Invalid video format. Accepted: mp4, webm, ogg, quicktime, avi.',
            'upload_key.required_without' => 'An upload key is required.',
            'status.required' => 'Status is required.',
            'status.in' => 'Invalid status value.',
            'scheduled_at.after' => 'Scheduled date must be in the future.',
        ];
    }

    /**
     * Custom validation logic: scheduled_at constraint + tus key ownership.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $this->afterValidatingSchedule($v);

            $uploadKey = $this->input('upload_key');
            $thumbnailKey = $this->input('thumbnail_key');

            $hasUploadKey = is_string($uploadKey) && $uploadKey !== '';

            if ($hasUploadKey) {
                $this->assertKeyOwnership($v, $uploadKey, 'upload_key');
            }

            $hasThumbnailKey = is_string($thumbnailKey) && $thumbnailKey !== '';

            if (!$hasThumbnailKey) {
                return;
            }

            $this->assertKeyOwnership($v, $thumbnailKey, 'thumbnail_key');
        });
    }

    /**
     * Check that a tus key exists in cache and belongs to the authenticated user.
     */
    private function assertKeyOwnership(Validator $v, string $key, string $field): void
    {
        $ownerId = Cache::get("tus:owner:{$key}");
        $isOwner = $ownerId !== null && (int) $ownerId === (int) auth()->id();

        if ($isOwner) {
            return;
        }

        $v->errors()->add($field, 'Upload session not found or has expired.');
    }

    /**
     * Get the appropriate DTO based on upload mode (tus vs. direct).
     */
    public function getDTO(): CreateVideoDTO|FinalizeUploadDTO
    {
        $isTusUpload = $this->has('upload_key');

        if ($isTusUpload) {
            return FinalizeUploadDTO::fromRequest($this->validated());
        }

        return CreateVideoDTO::fromRequest($this->validated());
    }
}

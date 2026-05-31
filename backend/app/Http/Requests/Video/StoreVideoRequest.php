<?php

declare(strict_types=1);

namespace App\Http\Requests\Video;

use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\Enums\VideoStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * StoreVideoRequest — Validates video creation input.
 *
 * Accepts two mutually exclusive upload modes:
 *   - Direct upload: `video_file` (multipart/form-data) + optional `thumbnail_file`
 *   - Resumable upload: `upload_key` (tus session key) + optional `thumbnail_key`
 *
 * @property string $title Video title
 * @property string|null $description Video description
 * @property list<string> $tags Video tags
 * @property string $status Video status
 * @property UploadedFile|null $video_file Direct video file
 * @property UploadedFile|null $thumbnail_file Direct thumbnail file
 * @property string|null $upload_key Tus resumable upload key
 * @property string|null $thumbnail_key Tus resumable thumbnail key
 * @property string|null $scheduled_at When to publish (ISO 8601)
 * @property bool $is_batch Whether this is a batch upload (auto-apply fields)
 */
class StoreVideoRequest extends FormRequest
{
    /**
     * Determine if user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * Get the validation rules.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:50'],
            'status' => ['required', 'string', Rule::enum(VideoStatus::class)],
            'scheduled_at' => ['nullable', 'date_format:Y-m-d\TH:i:sP'],
            'video_file' => ['required_without:upload_key', 'nullable', 'file', 'mimes:mp4,webm,ogg,quicktime,x-msvideo', 'max:2097152'],
            'thumbnail_file' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2097152'],
            'upload_key' => ['required_without:video_file', 'nullable', 'string'],
            'thumbnail_key' => ['nullable', 'string'],
            'is_batch' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Get custom validation messages.
     *
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
            $status = $this->input('status');
            $scheduledAt = $this->input('scheduled_at');

            $isScheduled = $status === VideoStatus::SCHEDULED->value;
            $hasScheduledAt = $scheduledAt !== null;

            if ($isScheduled && !$hasScheduledAt) {
                $v->errors()->add('scheduled_at', 'Scheduled date is required when status is scheduled.');
            }

            $uploadKey = $this->input('upload_key');
            $thumbnailKey = $this->input('thumbnail_key');

            $hasUploadKey = is_string($uploadKey) && $uploadKey !== '';

            if ($hasUploadKey) {
                $this->assertKeyOwnership($v, $uploadKey, 'upload_key');
            }

            $hasThumbnailKey = is_string($thumbnailKey) && $thumbnailKey !== '';

            if ($hasThumbnailKey) {
                $this->assertKeyOwnership($v, $thumbnailKey, 'thumbnail_key');
            }
        });
    }

    /**
     * Check that a tus key exists in cache and belongs to the authenticated user.
     *
     * @param string $key Tus upload key
     * @param string $field Request field name for error reporting
     */
    private function assertKeyOwnership(Validator $v, string $key, string $field): void
    {
        $ownerId = Cache::get("tus:owner:{$key}");
        $isOwner = $ownerId !== null && (int) $ownerId === (int) auth()->id();

        if (!$isOwner) {
            $v->errors()->add($field, 'Upload session not found or has expired.');
        }
    }

    /**
     * Get the appropriate DTO based on upload mode (tus vs. direct).
     *
     * @return CreateVideoDTO|FinalizeUploadDTO
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

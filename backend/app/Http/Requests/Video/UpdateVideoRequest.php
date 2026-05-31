<?php

declare(strict_types=1);

namespace App\Http\Requests\Video;

use App\DTOs\UpdateVideoDTO;
use App\Enums\VideoStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * UpdateVideoRequest — Validates video update input.
 *
 * @property string|null $title Video title
 * @property string|null $description Video description
 * @property list<string>|null $tags Video tags
 * @property string|null $status Video status
 * @property string|null $scheduled_at When to publish
 */
class UpdateVideoRequest extends FormRequest
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
     * @return array<string, string|list<string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:50'],
            'status' => ['nullable', 'in:' . implode(',', array_column(VideoStatus::cases(), 'value'))],
            'scheduled_at' => ['nullable', 'date_format:Y-m-d\TH:i:sP'],
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
            'title.max' => 'Title cannot exceed 255 characters.',
            'description.max' => 'Description cannot exceed 5000 characters.',
            'tags.max' => 'A maximum of 20 tags is allowed.',
            'status.in' => 'Invalid status value.',
        ];
    }

    /**
     * Custom validation logic.
     *
     * @param Validator $validator
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $status = $this->input('status');
            $scheduledAt = $this->input('scheduled_at');

            if ($status === VideoStatus::SCHEDULED->value && $scheduledAt === null) {
                $validator->errors()->add('scheduled_at', 'Scheduled date is required when status is scheduled.');
            }
        });
    }

    /**
     * Get the DTO for updating a video.
     *
     * @return UpdateVideoDTO
     */
    public function getDTO(): UpdateVideoDTO
    {
        return UpdateVideoDTO::fromRequest($this->validated());
    }
}

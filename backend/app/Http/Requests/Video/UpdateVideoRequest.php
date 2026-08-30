<?php

declare(strict_types=1);

namespace App\Http\Requests\Video;

use App\DTOs\UpdateVideoDTO;
use App\Http\Requests\Concerns\ValidatesVideoMetadata;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * @property string|null $title
 * @property string|null $description
 * @property list<string>|null $tags
 * @property string|null $status
 * @property string|null $scheduled_at
 */
class UpdateVideoRequest extends FormRequest
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
        return $this->videoMetadataRules(required: false);
    }

    /**
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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $this->afterValidatingSchedule($v);
        });
    }

    public function getDTO(): UpdateVideoDTO
    {
        return UpdateVideoDTO::fromRequest($this->validated());
    }
}

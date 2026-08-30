<?php

declare(strict_types=1);

namespace App\Http\Requests\Video;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @property int $percent
 */
class UpdateProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * @return array<string, string|list<string>>
     */
    public function rules(): array
    {
        return [
            'percent' => ['required', 'integer', 'min:0', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'percent.required' => 'Progress percentage is required.',
            'percent.integer' => 'Progress percentage must be an integer.',
            'percent.min' => 'Progress percentage cannot be less than 0.',
            'percent.max' => 'Progress percentage cannot be greater than 100.',
        ];
    }
}

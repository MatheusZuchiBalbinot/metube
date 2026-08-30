<?php

declare(strict_types=1);

namespace App\Http\Requests\Playlist;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @property string $vuid
 */
class AddVideoRequest extends FormRequest
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
            'vuid' => ['required', 'string', 'exists:videos,vuid'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vuid.required' => 'Video identifier is required.',
            'vuid.exists' => 'Video not found.',
        ];
    }
}

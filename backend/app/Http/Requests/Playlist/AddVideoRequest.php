<?php

namespace App\Http\Requests\Playlist;

use Illuminate\Foundation\Http\FormRequest;

/**
 * AddVideoRequest — Validates adding video to playlist.
 *
 * @property string $vuid Video identifier to add
 */
class AddVideoRequest extends FormRequest
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
            'vuid' => ['required', 'string', 'exists:videos,vuid'],
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
            'vuid.required' => 'Video identifier is required.',
            'vuid.exists' => 'Video not found.',
        ];
    }
}

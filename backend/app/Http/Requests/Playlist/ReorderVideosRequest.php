<?php

namespace App\Http\Requests\Playlist;

use Illuminate\Foundation\Http\FormRequest;

/**
 * ReorderVideosRequest — Validates playlist video reordering.
 *
 * @property list<string> $vuids Ordered list of video UUIDs
 */
class ReorderVideosRequest extends FormRequest
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
            'vuids' => ['required', 'array', 'min:1'],
            'vuids.*' => ['string', 'exists:videos,vuid'],
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
            'vuids.required' => 'Lista de UUIDs é obrigatória',
            'vuids.array' => 'Vuids deve ser um array',
            'vuids.min' => 'Pelo menos um vídeo deve ser fornecido',
            'vuids.*.exists' => 'Each VUID must reference an existing video',
        ];
    }
}

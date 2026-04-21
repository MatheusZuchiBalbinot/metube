<?php

namespace App\Http\Requests\Playlist;

use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdatePlaylistRequest — Validates playlist update input.
 *
 * @property string $name Playlist name
 */
class UpdatePlaylistRequest extends FormRequest
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
            'name' => ['required', 'string', 'min:1', 'max:255'],
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
            'name.required' => 'Nome da playlist é obrigatório',
            'name.min' => 'Nome não pode estar vazio',
            'name.max' => 'Nome não pode exceder 255 caracteres',
        ];
    }
}

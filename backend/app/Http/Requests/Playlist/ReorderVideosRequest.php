<?php

declare(strict_types=1);

namespace App\Http\Requests\Playlist;

use App\DTOs\ReorderPlaylistVideosDTO;
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
            'vuids.required' => 'The list of video identifiers is required.',
            'vuids.array' => 'Video identifiers must be an array.',
            'vuids.min' => 'At least one video must be provided.',
            'vuids.*.exists' => 'Each video identifier must reference an existing video.',
        ];
    }

    public function getDTO(): ReorderPlaylistVideosDTO
    {
        return ReorderPlaylistVideosDTO::fromRequest($this->validated());
    }
}

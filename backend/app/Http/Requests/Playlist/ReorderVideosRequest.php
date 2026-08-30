<?php

declare(strict_types=1);

namespace App\Http\Requests\Playlist;

use App\DTOs\ReorderPlaylistVideosDTO;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property list<string> $vuids Ordered list of video UUIDs
 */
class ReorderVideosRequest extends FormRequest
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
            'vuids' => ['required', 'array', 'min:1'],
            'vuids.*' => ['string', 'exists:videos,vuid'],
        ];
    }

    /**
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

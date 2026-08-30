<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\DTOs\UpdateUserProfileDTO;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property string|null $name
 * @property string|null $bio
 */
class UpdateProfileRequest extends FormRequest
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
            'name' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.max' => 'Name cannot exceed 255 characters.',
            'bio.max' => 'Bio cannot exceed 1000 characters.',
        ];
    }

    public function getDTO(): UpdateUserProfileDTO
    {
        return UpdateUserProfileDTO::fromRequest($this->validated());
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Comment;

use App\DTOs\UpdateCommentDTO;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'min:1', 'max:2000'],
        ];
    }

    public function getDTO(): UpdateCommentDTO
    {
        return UpdateCommentDTO::fromRequest($this->validated());
    }
}

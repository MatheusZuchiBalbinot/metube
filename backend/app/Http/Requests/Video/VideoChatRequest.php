<?php

declare(strict_types=1);

namespace App\Http\Requests\Video;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @property string $question
 * @property list<array{role: string, content: string}>|null $history
 */
class VideoChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'question' => ['required', 'string', 'max:500'],
            'history' => ['nullable', 'array', 'max:20'],
            'history.*.role' => ['required', 'string', 'in:user,assistant'],
            'history.*.content' => ['required', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'question.required' => 'A question is required.',
            'question.max' => 'Question must not exceed 500 characters.',
            'history.max' => 'Conversation history must not exceed 20 turns.',
            'history.*.role.in' => 'Each history entry role must be "user" or "assistant".',
            'history.*.content.max' => 'Each history entry must not exceed 2000 characters.',
        ];
    }
}

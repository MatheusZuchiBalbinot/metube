<?php

namespace App\Http\Requests\Analytics;

use Illuminate\Foundation\Http\FormRequest;

/**
 * LogClickRequest — Validates a single feed click event.
 *
 * @property string $vuid
 * @property string $source
 * @property int|null $position
 * @property string|null $session_id
 */
class LogClickRequest extends FormRequest
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
            'source' => ['required', 'string', 'in:feed,search,channel,playlist,recommended,home'],
            'position' => ['nullable', 'integer', 'min:0'],
            'session_id' => ['nullable', 'string', 'max:64'],
        ];
    }
}

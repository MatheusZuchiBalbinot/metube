<?php

namespace App\Http\Requests\Analytics;

use Illuminate\Foundation\Http\FormRequest;

/**
 * LogSearchRequest — Validates a search-performed event.
 *
 * @property string $query
 * @property int $result_count
 * @property string|null $session_id
 */
class LogSearchRequest extends FormRequest
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
            'query' => ['required', 'string', 'min:1', 'max:200'],
            'result_count' => ['required', 'integer', 'min:0'],
            'session_id' => ['nullable', 'string', 'max:64'],
        ];
    }
}

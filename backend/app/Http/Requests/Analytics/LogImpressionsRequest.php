<?php

namespace App\Http\Requests\Analytics;

use Illuminate\Foundation\Http\FormRequest;

/**
 * LogImpressionsRequest — Validates a batch of video impressions.
 *
 * @property list<string> $vuids
 * @property string $source
 * @property string|null $session_id
 */
class LogImpressionsRequest extends FormRequest
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
            'vuids' => ['required', 'array', 'min:1', 'max:100'],
            'vuids.*' => ['required', 'string', 'exists:videos,vuid'],
            'source' => ['required', 'string', 'in:feed,search,channel,playlist,recommended,home'],
            'session_id' => ['nullable', 'string', 'max:64'],
        ];
    }
}

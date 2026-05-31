<?php

declare(strict_types=1);

namespace App\Http\Requests\Analytics;

use App\Enums\VideoSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'vuids' => ['required', 'array', 'min:1', 'max:100'],
            'vuids.*' => ['required', 'string', 'exists:videos,vuid'],
            'source' => ['required', 'string', Rule::enum(VideoSource::class)],
            'session_id' => ['nullable', 'string', 'max:64'],
        ];
    }
}

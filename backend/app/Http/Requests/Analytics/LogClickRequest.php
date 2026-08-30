<?php

declare(strict_types=1);

namespace App\Http\Requests\Analytics;

use App\Enums\VideoSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'vuid' => ['required', 'string', 'exists:videos,vuid'],
            'source' => ['required', 'string', Rule::enum(VideoSource::class)],
            'position' => ['nullable', 'integer', 'min:0'],
            'session_id' => ['nullable', 'string', 'max:64'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Video;

use App\Enums\VideoSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @property string $source
 * @property string|null $session_id
 */
class RecordViewRequest extends FormRequest
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
            'source' => ['nullable', 'string', Rule::enum(VideoSource::class)],
            'session_id' => ['nullable', 'string', 'max:64'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Video;

use App\Enums\VideoSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * RecordViewRequest — Validates a video view event.
 *
 * @property string $source Optional source of the view
 * @property string|null $session_id Optional session identifier
 */
class RecordViewRequest extends FormRequest
{
    /**
     * Determine if user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * Get the validation rules.
     *
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

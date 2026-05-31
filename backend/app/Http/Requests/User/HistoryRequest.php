<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Enums\HistoryPeriod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * HistoryRequest — Validates watch history query parameters.
 *
 * @property string $period Period filter for history
 * @property int|null $page Page number for pagination
 * @property int|null $perPage Items per page
 */
class HistoryRequest extends FormRequest
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
            'period' => ['nullable', 'string', Rule::enum(HistoryPeriod::class)],
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}

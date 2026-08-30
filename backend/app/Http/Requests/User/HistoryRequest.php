<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Enums\HistoryPeriod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @property string $period
 * @property int|null $page
 * @property int|null $perPage
 */
class HistoryRequest extends FormRequest
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
            'period' => ['nullable', 'string', Rule::enum(HistoryPeriod::class)],
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}

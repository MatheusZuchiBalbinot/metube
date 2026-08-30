<?php

declare(strict_types=1);

namespace App\Http\Requests\Analytics;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @property string $vuid
 * @property int $percent
 */
class LogSkipRequest extends FormRequest
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
            'percent' => ['required', 'integer', 'min:0', 'max:100'],
        ];
    }
}

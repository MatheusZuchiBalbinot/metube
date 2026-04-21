<?php

namespace App\Http\Requests\Video;

use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdateProgressRequest — Validates video progress update input.
 *
 * @property int $percent Watch progress percentage (0-100)
 */
class UpdateProgressRequest extends FormRequest
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
     * @return array<string, string|list<string>>
     */
    public function rules(): array
    {
        return [
            'percent' => ['required', 'integer', 'min:0', 'max:100'],
        ];
    }

    /**
     * Get custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'percent.required' => 'Percentual de progresso é obrigatório',
            'percent.integer' => 'Percentual deve ser um número inteiro',
            'percent.min' => 'Percentual não pode ser menor que 0',
            'percent.max' => 'Percentual não pode ser maior que 100',
        ];
    }
}

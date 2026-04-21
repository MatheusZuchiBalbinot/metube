<?php

namespace App\Http\Requests\Video;

use App\Enums\VideoStatus;
use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdateVideoRequest — Validates video update input.
 *
 * @property string|null $title Video title
 * @property string|null $description Video description
 * @property list<string>|null $tags Video tags
 * @property string|null $status Video status
 * @property string|null $scheduled_at When to publish
 */
class UpdateVideoRequest extends FormRequest
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
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:50'],
            'status' => ['nullable', 'in:' . implode(',', array_column(VideoStatus::cases(), 'value'))],
            'scheduled_at' => ['nullable', 'date_format:Y-m-d\TH:i:sP'],
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
            'title.max' => 'Título não pode exceder 255 caracteres',
            'description.max' => 'Descrição não pode exceder 5000 caracteres',
            'tags.max' => 'Máximo de 20 tags permitidas',
            'status.in' => 'Status inválido',
        ];
    }

    /**
     * Custom validation logic.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $status = $this->get('status');
            $scheduledAt = $this->get('scheduled_at');

            if ($status === VideoStatus::SCHEDULED->value && $scheduledAt === null) {
                $validator->errors()->add('scheduled_at', 'Data de agendamento é obrigatória quando status é scheduled');
            }
        });
    }
}

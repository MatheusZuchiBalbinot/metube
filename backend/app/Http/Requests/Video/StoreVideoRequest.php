<?php

namespace App\Http\Requests\Video;

use App\Enums\VideoStatus;
use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreVideoRequest — Validates video creation input.
 *
 * @property string $title Video title
 * @property string $description Video description
 * @property list<string> $tags Video tags
 * @property string $status Video status
 * @property \Illuminate\Http\UploadedFile $video_file Video file
 * @property \Illuminate\Http\UploadedFile|null $thumbnail_file Custom thumbnail
 * @property string|null $scheduled_at When to publish (ISO 8601)
 */
class StoreVideoRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:50'],
            'status' => ['required', 'in:' . implode(',', array_column(VideoStatus::cases(), 'value'))],
            'scheduled_at' => ['nullable', 'date_format:Y-m-d\TH:i:sP'],
            'video_file' => ['required', 'file', 'mimes:mp4,webm,ogg,quicktime,x-msvideo', 'max:2097152'],
            'thumbnail_file' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2097152'],
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
            'title.required' => 'Título do vídeo é obrigatório',
            'video_file.required' => 'Arquivo de vídeo é obrigatório',
            'video_file.mimes' => 'Formato de vídeo inválido (mp4, webm, ogg, quicktime, avi)',
            'status.required' => 'Status é obrigatório',
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

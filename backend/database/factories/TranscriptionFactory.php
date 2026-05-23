<?php

namespace Database\Factories;

use App\Enums\TranscriptionStatus;
use App\Models\Transcription;
use App\Models\Video;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Transcription>
 */
class TranscriptionFactory extends Factory
{
    protected $model = Transcription::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'video_id' => Video::factory(),
            'language' => 'pt',
            'content' => $this->faker->paragraphs(5, true),
            'status' => TranscriptionStatus::COMPLETED,
            'started_at' => now()->subMinutes(5),
        ];
    }
}

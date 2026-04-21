<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Video;
use App\Models\VideoProgress;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\VideoProgress>
 */
class VideoProgressFactory extends Factory
{
    protected $model = VideoProgress::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'video_id' => Video::factory(),
            'percent' => $this->faker->numberBetween(0, 100),
        ];
    }

    /**
     * Indicate that the video is completed.
     */
    public function completed(): self
    {
        return $this->state(fn (array $attributes) => [
            'percent' => 100,
        ]);
    }

    /**
     * Indicate that the video is partially watched.
     */
    public function partial(): self
    {
        return $this->state(fn (array $attributes) => [
            'percent' => $this->faker->numberBetween(1, 99),
        ]);
    }
}

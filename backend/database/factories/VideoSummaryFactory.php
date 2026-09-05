<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Video;
use App\Models\VideoSummary;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\VideoSummary>
 */
class VideoSummaryFactory extends Factory
{
    protected $model = VideoSummary::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'video_id' => Video::factory(),
            'key_points' => [
                $this->faker->sentence(),
                $this->faker->sentence(),
                $this->faker->sentence(),
            ],
            'chapters' => [
                ['timestamp' => '0:00', 'title' => $this->faker->words(3, true)],
                ['timestamp' => '5:30', 'title' => $this->faker->words(3, true)],
                ['timestamp' => '12:45', 'title' => $this->faker->words(3, true)],
            ],
            'reading_mode' => $this->faker->paragraph(),
        ];
    }
}

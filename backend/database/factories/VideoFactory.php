<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Video>
 */
class VideoFactory extends Factory
{
    protected $model = Video::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'channel_id' => User::factory(),
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'tags' => ['tutorial', 'coding', 'education'],
            'status' => $this->faker->randomElement(VideoStatus::cases()),
            'duration' => $this->faker->numberBetween(60, 3600),
            'views' => $this->faker->numberBetween(0, 100000),
            'video_url' => $this->faker->url(),
            'thumbnail_url' => $this->faker->imageUrl(),
            'published_at' => $this->faker->dateTime(),
            'scheduled_at' => null,
        ];
    }

    public function published(): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => VideoStatus::PUBLISHED,
            'published_at' => now(),
        ]);
    }

    public function scheduled(): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => VideoStatus::SCHEDULED,
            'scheduled_at' => now()->addDay(),
            'published_at' => null,
        ]);
    }

    public function processing(): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => VideoStatus::PROCESSING,
            'published_at' => null,
        ]);
    }

    public function draft(): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => VideoStatus::DRAFT,
            'published_at' => null,
        ]);
    }
}

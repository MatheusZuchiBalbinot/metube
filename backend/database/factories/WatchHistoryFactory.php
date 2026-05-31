<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use App\Models\Video;
use App\Models\WatchHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WatchHistory>
 */
class WatchHistoryFactory extends Factory
{
    protected $model = WatchHistory::class;

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
            'watched_at' => $this->faker->dateTime(),
        ];
    }
}

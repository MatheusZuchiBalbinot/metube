<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@videosummarizer.com'],
            [
                'name' => 'Admin',
                'password' => 'password',
                'email_verified_at' => now(),
            ],
        );
    }
}

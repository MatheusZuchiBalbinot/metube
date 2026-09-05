<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        // Unread notifications: header badge polls this for every authenticated request.
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('
                CREATE INDEX notifications_user_unread_idx
                ON notifications (notifiable_id, notifiable_type, created_at DESC)
                WHERE read_at IS NULL
            ');
        } else {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index(['notifiable_id', 'notifiable_type', 'read_at', 'created_at'], 'notifications_user_unread_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('uuid', 26)->nullable()->unique()->after('id');
            $table->text('bio')->nullable()->after('email');
            $table->string('avatar')->nullable()->after('bio');
        });

        DB::table('users')->whereNull('uuid')->eachById(function ($user): void {
            DB::table('users')->where('id', $user->id)->update(['uuid' => (string) Str::ulid()]);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['uuid', 'bio', 'avatar']);
        });
    }
};

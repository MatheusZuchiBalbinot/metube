<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration
{
    public function up(): void
    {
        Schema::table('comments', function (Blueprint $table): void {
            $table->dropColumn('is_edited');
            $table->unsignedBigInteger('current_version_id')->nullable()->after('replies_count');
            $table->foreign('current_version_id')->references('id')->on('comment_versions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table): void {
            $table->dropForeign(['current_version_id']);
            $table->dropColumn('current_version_id');
            $table->boolean('is_edited')->default(false)->after('replies_count');
        });
    }
};

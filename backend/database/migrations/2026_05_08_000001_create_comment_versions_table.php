<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration
{
    public function up(): void
    {
        Schema::create('comment_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('comment_id')->constrained('comments')->cascadeOnDelete();
            $table->text('content');
            $table->unsignedSmallInteger('version');
            $table->timestamp('created_at')->useCurrent();

            $table->index('comment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_versions');
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration
{
    public function up(): void
    {
        Schema::create('transcriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('video_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('language', 10)->nullable();
            $table->text('content')->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->index('video_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transcriptions');
    }
};

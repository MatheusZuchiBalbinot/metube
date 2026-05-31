<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// ============================================================================
// Web Routes
// ============================================================================

Route::get('/', function () {
    return view('welcome');
})->name('welcome');

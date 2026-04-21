<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;

/**
 * Controller — Base class for all HTTP controllers.
 *
 * Provides common functionality:
 * - Authorization via policies ($this->authorize)
 * - Validation helpers ($this->validate, ValidatesRequests)
 * - JSON responses ($this->json)
 */
abstract class Controller
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Return a JSON response.
     *
     * @param  mixed  $data  Data to return as JSON
     * @param  int  $status  HTTP status code
     */
    protected function json($data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status);
    }

    /**
     * Return HTTP 204 No Content response.
     *
     * Use for successful operations with no response body (DELETE, etc.)
     *
     * @return \Illuminate\Http\Response
     */
    protected function noContent()
    {
        return response()->noContent();
    }
}

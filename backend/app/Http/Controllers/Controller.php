<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Illuminate\Http\Response;

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
     * @param mixed $data Data to return as JSON
     * @param int $status HTTP status code
     */
    protected function json($data, int $status = 200): JsonResponse
    {
        if ($data instanceof ResourceCollection) {
            return $data->toResponse(request())->setStatusCode($status);
        }

        return response()->json($data, $status);
    }

    /**
     * Return HTTP 204 No Content response.
     *
     * Use for successful operations with no response body (DELETE, etc.)
     *
     * @return Response
     */
    protected function noContent()
    {
        return response()->noContent();
    }
}

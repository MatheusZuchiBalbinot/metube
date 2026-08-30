<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Illuminate\Http\Response;

abstract class Controller
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * @param mixed $data
     */
    protected function json($data, int $status = 200): JsonResponse
    {
        if ($data instanceof ResourceCollection) {
            return $data->toResponse(request())->setStatusCode($status);
        }

        return response()->json($data, $status);
    }

    /**
     * @return Response
     */
    protected function noContent()
    {
        return response()->noContent();
    }
}

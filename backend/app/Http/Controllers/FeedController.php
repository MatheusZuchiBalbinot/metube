<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\FeedSectionResource;
use App\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FeedController — Serves the composed home feed (shelves).
 *
 * Public: logged-in users receive personalised sections, guests the generic ones.
 */
class FeedController extends Controller
{
    public function __construct(private readonly FeedService $feedService) {}

    public function index(Request $request): JsonResponse
    {
        $sections = $this->feedService->forUser($request->user());

        return $this->json(FeedSectionResource::collection($sections));
    }
}

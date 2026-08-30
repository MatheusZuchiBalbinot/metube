<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\VideoSource;
use App\Http\Requests\Analytics\LogClickRequest;
use App\Http\Requests\Analytics\LogImpressionsRequest;
use App\Http\Requests\Analytics\LogSearchRequest;
use App\Http\Requests\Analytics\LogSkipRequest;
use App\Services\AnalyticsService;
use App\Services\VideoService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Response;

/**
 * AnalyticsController — Receives client-reported user events.
 *
 * Routes for impressions, clicks, searches and skips. All endpoints return
 * 204 to keep the client side fire-and-forget.
 */
class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analyticsService,
        private readonly VideoService $videoService,
    ) {}

    public function impressions(LogImpressionsRequest $request): Response
    {
        $data = $request->validated();
        $user = auth()->user();
        $source = VideoSource::from($data['source']);
        $sessionId = $data['session_id'] ?? null;

        $this->analyticsService->recordImpressions($user, $data['vuids'], $source, $sessionId);

        return $this->noContent();
    }

    /**
     * @throws ModelNotFoundException
     */
    public function click(LogClickRequest $request): Response
    {
        $data = $request->validated();
        $video = $this->videoService->getVideoByUuid($data['vuid']);
        $user = auth()->user();
        $source = VideoSource::from($data['source']);
        $position = $data['position'] ?? null;
        $sessionId = $data['session_id'] ?? null;

        $this->analyticsService->recordClick($user, $video, $source, $position, $sessionId);

        return $this->noContent();
    }

    public function search(LogSearchRequest $request): Response
    {
        $data = $request->validated();
        $user = auth()->user();
        $sessionId = $data['session_id'] ?? null;

        $this->analyticsService->recordSearch($user, $data['query'], $data['result_count'], $sessionId);

        return $this->noContent();
    }

    /**
     * @throws ModelNotFoundException
     */
    public function skip(LogSkipRequest $request): Response
    {
        $data = $request->validated();
        $video = $this->videoService->getVideoByUuid($data['vuid']);
        $user = auth()->user();

        $this->analyticsService->recordSkip($user, $video, $data['percent']);

        return $this->noContent();
    }
}

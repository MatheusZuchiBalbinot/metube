<?php

namespace App\Http\Controllers;

use App\Http\Requests\Analytics\LogClickRequest;
use App\Http\Requests\Analytics\LogImpressionsRequest;
use App\Http\Requests\Analytics\LogSearchRequest;
use App\Http\Requests\Analytics\LogSkipRequest;
use App\Services\AnalyticsService;
use App\Services\VideoService;
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

    /**
     * Log a batch of feed impressions.
     *
     * @param  LogImpressionsRequest  $request  Validated batch
     * @return Response HTTP 204 No Content
     */
    public function impressions(LogImpressionsRequest $request): Response
    {
        $data = $request->validated();

        $this->analyticsService->recordImpressions(
            auth()->user(),
            $data['vuids'],
            $data['source'],
            $data['session_id'] ?? null,
        );

        return $this->noContent();
    }

    /**
     * Log a click on a feed-rendered video.
     *
     * @param  LogClickRequest  $request  Validated click
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function click(LogClickRequest $request): Response
    {
        $data = $request->validated();
        $video = $this->videoService->getVideoByUuid($data['vuid']);

        $this->analyticsService->recordClick(
            auth()->user(),
            $video,
            $data['source'],
            $data['position'] ?? null,
            $data['session_id'] ?? null,
        );

        return $this->noContent();
    }

    /**
     * Log a search query the user just performed.
     *
     * @param  LogSearchRequest  $request  Validated search
     * @return Response HTTP 204 No Content
     */
    public function search(LogSearchRequest $request): Response
    {
        $data = $request->validated();

        $this->analyticsService->recordSearch(
            auth()->user(),
            $data['query'],
            $data['result_count'],
            $data['session_id'] ?? null,
        );

        return $this->noContent();
    }

    /**
     * Log a video skip / early abandon.
     *
     * @param  LogSkipRequest  $request  Validated skip
     * @return Response HTTP 204 No Content
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function skip(LogSkipRequest $request): Response
    {
        $data = $request->validated();
        $video = $this->videoService->getVideoByUuid($data['vuid']);

        $this->analyticsService->recordSkip(
            auth()->user(),
            $video,
            $data['percent'],
        );

        return $this->noContent();
    }
}

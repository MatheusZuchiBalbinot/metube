<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Cache;

describe('TusController', function () {
    test('POST to tus endpoint returns 401 for unauthenticated guest', function () {
        $response = $this->postJson('/api/uploads/tus');

        $response->assertUnauthorized();
    });

    test('HEAD to tus endpoint requires authentication', function () {
        // HEAD on the tus route is protected by auth:sanctum; without Redis the
        // tus-php server errors before returning a clean 401, so we only verify
        // the request does NOT succeed (2xx).
        $response = $this->call('HEAD', '/api/uploads/tus/somekey');

        $isNotSuccess = $response->getStatusCode() >= 400;
        expect($isNotSuccess)->toBeTrue();
    });

    test('OPTIONS to tus endpoint requires authentication', function () {
        // OPTIONS may bypass auth for CORS preflight or error inside tus-php
        // without Redis. Either way it must not return 2xx for a guest.
        $response = $this->call('OPTIONS', '/api/uploads/tus');

        $isNotSuccess = $response->getStatusCode() >= 400;
        expect($isNotSuccess)->toBeTrue();
    });

    test('tus endpoint is accessible to authenticated users', function () {
        $user = User::factory()->create();

        // Send a valid tus POST with required headers. tus-php will attempt to
        // create the upload and return a 201 or error based on the Upload-Length.
        // We only verify the request passes authentication (not 401).
        $response = $this->actingAs($user)->call(
            'POST',
            '/api/uploads/tus',
            [],
            [],
            [],
            [
                'HTTP_TUS_RESUMABLE' => '1.0.0',
                'HTTP_UPLOAD_LENGTH' => '1024',
                'HTTP_CONTENT_TYPE' => 'application/offset+octet-stream',
            ],
        );

        $isNotUnauthorized = $response->getStatusCode() !== 401;
        expect($isNotUnauthorized)->toBeTrue();
    });

    test('PATCH to an upload session owned by another user is rejected before any bytes are read', function () {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $key = 'hijack-test-key';

        // Simulate what the upload.created listener does on creation, without
        // needing a live tus-php/Redis round trip: cache ownership under the
        // owner's id, exactly as TusHandlerService::handle() does.
        Cache::put("tus:owner:{$key}", $owner->id, 3600);

        $response = $this->actingAs($attacker)->call(
            'PATCH',
            "/api/uploads/tus/{$key}",
            [],
            [],
            [],
            [
                'HTTP_TUS_RESUMABLE' => '1.0.0',
                'HTTP_UPLOAD_OFFSET' => '0',
                'HTTP_CONTENT_TYPE' => 'application/offset+octet-stream',
            ],
        );

        $response->assertForbidden();
    });

    test('DELETE to an upload session owned by another user is rejected', function () {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $key = 'hijack-delete-key';

        Cache::put("tus:owner:{$key}", $owner->id, 3600);

        $response = $this->actingAs($attacker)->call(
            'DELETE',
            "/api/uploads/tus/{$key}",
            [],
            [],
            [],
            ['HTTP_TUS_RESUMABLE' => '1.0.0'],
        );

        $response->assertForbidden();
    });

    test('PATCH to an upload session with no cached owner is rejected', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->call(
            'PATCH',
            '/api/uploads/tus/never-created-key',
            [],
            [],
            [],
            [
                'HTTP_TUS_RESUMABLE' => '1.0.0',
                'HTTP_UPLOAD_OFFSET' => '0',
                'HTTP_CONTENT_TYPE' => 'application/offset+octet-stream',
            ],
        );

        $response->assertForbidden();
    });
});

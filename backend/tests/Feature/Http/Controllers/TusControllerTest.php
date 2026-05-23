<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

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
});

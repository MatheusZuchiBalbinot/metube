<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    /**
     * Authenticate user with email and password.
     *
     * @param  LoginRequest  $request  Validated: email, password
     * @return JsonResponse {user: User}
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->authService->login($request->validated());

        return $this->json(['user' => new UserResource($user)]);
    }

    /**
     * Logout authenticated user.
     *
     * @return JsonResponse {message: string}
     */
    public function logout(): JsonResponse
    {
        $this->authService->logout();

        return $this->json(['message' => trans('messages.auth.logout_success')]);
    }

    /**
     * Get authenticated user profile.
     *
     * @return JsonResponse User resource
     */
    public function me(): JsonResponse
    {
        return $this->json(new UserResource($this->authService->me()));
    }

    /**
     * Update authenticated user profile.
     *
     * @param  UpdateProfileRequest  $request  Validated: name?, bio?
     * @return JsonResponse User resource
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->authService->updateProfile($request->validated());

        return $this->json(new UserResource($user));
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    /**
     * @throws ValidationException
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->authService->login($request->validated());

        $response = ['user' => new UserResource($user)];

        return $this->json($response);
    }

    public function logout(): JsonResponse
    {
        $this->authService->logout();

        $response = ['message' => trans('messages.auth.logout_success')];

        return $this->json($response);
    }

    public function me(): JsonResponse
    {
        return $this->json(new UserResource($this->authService->me()));
    }

    /**
     * Only the user themself may patch their record.
     */
    public function updateProfile(string $uuid, UpdateProfileRequest $request): JsonResponse
    {
        $target = User::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $target);

        $user = $this->authService->updateProfile($request->validated());

        return $this->json(new UserResource($user));
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->authService->register($request->validated());

        $response = ['user' => new UserResource($user)];

        return $this->json($response, 201);
    }

    /**
     * @throws ValidationException
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $this->authService->sendPasswordResetLink($request->validated('email'));

        $response = ['message' => trans('passwords.sent')];

        return $this->json($response);
    }

    /**
     * @throws ValidationException
     */
    public function resetPassword(string $token, ResetPasswordRequest $request): JsonResponse
    {
        $payload = [
            'token' => $token,
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
        ];
        $this->authService->resetPassword($payload);

        $response = ['message' => trans('passwords.reset')];

        return $this->json($response);
    }

    public function verifyEmail(EmailVerificationRequest $request): JsonResponse
    {
        $request->fulfill();

        $response = ['message' => 'Email verified.'];

        return $this->json($response);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $request->user()->sendEmailVerificationNotification();

        $response = ['message' => 'Verification email sent.'];

        return $this->json($response);
    }
}

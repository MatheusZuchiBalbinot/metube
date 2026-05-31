<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    /**
     * Authenticate user with email and password.
     *
     * @param LoginRequest $request Validated: email, password
     *
     * @throws \Illuminate\Validation\ValidationException
     *
     * @return JsonResponse {user: User}
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->authService->login($request->validated());

        $response = ['user' => new UserResource($user)];

        return $this->json($response);
    }

    /**
     * Logout authenticated user.
     *
     * @return JsonResponse {message: string}
     */
    public function logout(): JsonResponse
    {
        $this->authService->logout();

        $response = ['message' => trans('messages.auth.logout_success')];

        return $this->json($response);
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
     * Update a user profile. Only the user themself may patch their record.
     *
     * @param string $uuid Target user UUID (must match the authenticated user)
     * @param UpdateProfileRequest $request Validated: name?, bio?
     *
     * @return JsonResponse User resource
     */
    public function updateProfile(string $uuid, UpdateProfileRequest $request): JsonResponse
    {
        abort_unless(auth()->user()->uuid === $uuid, 403);

        $user = $this->authService->updateProfile($request->validated());

        return $this->json(new UserResource($user));
    }

    /**
     * Register a new user account.
     *
     * @param RegisterRequest $request Validated: name, email, password, password_confirmation
     *
     * @return JsonResponse {user: User}
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->authService->register($request->validated());

        $response = ['user' => new UserResource($user)];

        return $this->json($response, 201);
    }

    /**
     * Send a password reset link to the given email address.
     *
     * @param ForgotPasswordRequest $request Validated: email
     *
     * @throws \Illuminate\Validation\ValidationException
     *
     * @return JsonResponse {message: string}
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $this->authService->sendPasswordResetLink($request->validated('email'));

        $response = ['message' => trans('passwords.sent')];

        return $this->json($response);
    }

    /**
     * Reset the user's password using the given token.
     *
     * @param string $token Password reset token (from URL)
     * @param ResetPasswordRequest $request Validated: email, password, password_confirmation
     *
     * @throws \Illuminate\Validation\ValidationException
     *
     * @return JsonResponse {message: string}
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

    /**
     * Mark the authenticated user's email address as verified.
     *
     * @param EmailVerificationRequest $request Signed URL request
     *
     * @return JsonResponse {message: string}
     */
    public function verifyEmail(EmailVerificationRequest $request): JsonResponse
    {
        $request->fulfill();

        $response = ['message' => 'Email verified.'];

        return $this->json($response);
    }

    /**
     * Resend the email verification notification.
     *
     * @return JsonResponse {message: string}
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $request->user()->sendEmailVerificationNotification();

        $response = ['message' => 'Verification email sent.'];

        return $this->json($response);
    }
}

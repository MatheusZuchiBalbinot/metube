<?php

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

    /**
     * Register a new user account.
     *
     * @param  RegisterRequest  $request  Validated: name, email, password, password_confirmation
     * @return JsonResponse {user: User}
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->authService->register($request->validated());

        return $this->json(['user' => new UserResource($user)], 201);
    }

    /**
     * Send a password reset link to the given email address.
     *
     * @param  ForgotPasswordRequest  $request  Validated: email
     * @return JsonResponse {message: string}
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $this->authService->sendPasswordResetLink($request->validated('email'));

        return $this->json(['message' => trans('passwords.sent')]);
    }

    /**
     * Reset the user's password using the given token.
     *
     * @param  ResetPasswordRequest  $request  Validated: token, email, password, password_confirmation
     * @return JsonResponse {message: string}
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $this->authService->resetPassword($request->validated());

        return $this->json(['message' => trans('passwords.reset')]);
    }

    /**
     * Mark the authenticated user's email address as verified.
     *
     * @param  EmailVerificationRequest  $request  Signed URL request
     * @return JsonResponse {message: string}
     */
    public function verifyEmail(EmailVerificationRequest $request): JsonResponse
    {
        $request->fulfill();

        return $this->json(['message' => 'Email verified.']);
    }

    /**
     * Resend the email verification notification.
     *
     * @return JsonResponse {message: string}
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $request->user()->sendEmailVerificationNotification();

        return $this->json(['message' => 'Verification email sent.']);
    }
}

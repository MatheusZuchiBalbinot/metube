<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

/**
 * ValidatesPlaylistName — Shared rules/messages for StorePlaylistRequest and
 * UpdatePlaylistRequest.
 *
 * Both requests validate the same "name" field with identical constraints
 * and error messages; only the resulting DTO differs. A plain trait (rather
 * than one request extending the other) is used because the two requests'
 * `getDTO()` methods return unrelated DTOs (CreatePlaylistDTO vs.
 * UpdatePlaylistDTO) — overriding a parent method's return type with an
 * unrelated class violates PHP's covariant-return-type rule and is a fatal
 * error, not just a lint issue.
 */
trait ValidatesPlaylistName
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * @return array<string, string|list<string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:1', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Playlist name is required.',
            'name.min' => 'Playlist name cannot be empty.',
            'name.max' => 'Playlist name cannot exceed 255 characters.',
        ];
    }
}

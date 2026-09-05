<?php

declare(strict_types=1);

namespace App\Http\Requests\Video;

use App\Enums\VideoStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * IndexVideoRequest — Validates video listing query parameters.
 *
 * The route is guest-accessible, so listing the default (published-only)
 * feed never requires authentication. Requesting a non-published `status`
 * is a privileged read — those videos belong to their owner — and is only
 * authorized for authenticated users; {@see \App\Services\VideoService}
 * further scopes such a query to the requester's own channel, so an
 * authenticated user can only ever see their own non-published videos,
 * never another user's drafts/scheduled/processing videos.
 *
 * @property string|null $search Free-text search term
 * @property list<string>|null $tags Tag filter (OR semantics)
 * @property string|null $status Status filter; non-published values require ownership
 * @property int|null $page Page number for pagination
 */
class IndexVideoRequest extends FormRequest
{
    /**
     * Guests may list published videos; a non-published status filter requires auth.
     */
    public function authorize(): bool
    {
        $status = $this->query('status');
        $isPrivilegedStatus = $status !== null && $status !== VideoStatus::PUBLISHED->value;

        if ($isPrivilegedStatus) {
            return auth()->check();
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'status' => ['nullable', 'string', Rule::enum(VideoStatus::class)],
            'page' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ];
    }
}

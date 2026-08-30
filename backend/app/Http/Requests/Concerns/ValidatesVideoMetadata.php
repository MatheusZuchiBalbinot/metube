<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use App\Enums\VideoStatus;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * ValidatesVideoMetadata — Shared rules/logic for StoreVideoRequest and
 * UpdateVideoRequest.
 *
 * Both requests validate the same metadata fields (title/description/tags/
 * status/scheduled_at) and both need "scheduled_at is required when status
 * is scheduled". Before this trait the two requests had independently
 * hand-written copies of that rule in two different code shapes — a fix to
 * one would not have been caught by the other's tests.
 */
trait ValidatesVideoMetadata
{
    /**
     * @param bool $required Whether title/status are required (Store) or
     *                       optional for a partial update (Update)
     *
     * @return array<string, list<mixed>>
     */
    protected function videoMetadataRules(bool $required): array
    {
        $presence = $required ? 'required' : 'nullable';

        return [
            'title' => [$presence, 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:50'],
            'status' => [$presence, 'string', Rule::enum(VideoStatus::class)],
            'scheduled_at' => ['nullable', 'date_format:Y-m-d\TH:i:sP'],
        ];
    }

    /**
     * Require `scheduled_at` when `status` is `scheduled`.
     */
    protected function afterValidatingSchedule(Validator $v): void
    {
        $status = $this->input('status');
        $scheduledAt = $this->input('scheduled_at');

        $isMissingScheduledAt = $status === VideoStatus::SCHEDULED->value && $scheduledAt === null;

        if (!$isMissingScheduledAt) {
            return;
        }

        $v->errors()->add('scheduled_at', 'Scheduled date is required when status is scheduled.');
    }
}

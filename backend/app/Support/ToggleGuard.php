<?php

declare(strict_types=1);

namespace App\Support;

final class ToggleGuard
{
    /**
     * Delete-first toggle for a unique per-user relation row (comment like,
     * video reaction, ...): two concurrent toggles would otherwise both read
     * "not set" and race to insert, tripping the unique constraint. NoOp
     * means this request's insert lost that race, so callers should skip
     * side effects (counters, events) for a row they didn't create.
     *
     * @param callable(): int $delete Deletes the existing row(s); returns rows affected.
     * @param callable(): int $insert Inserts the row (typically via insertOrIgnore); returns rows affected.
     */
    public static function run(callable $delete, callable $insert): ToggleOutcome
    {
        if ($delete() > 0) {
            return ToggleOutcome::Removed;
        }

        return $insert() > 0 ? ToggleOutcome::Applied : ToggleOutcome::NoOp;
    }
}

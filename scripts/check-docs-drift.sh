#!/usr/bin/env bash
#
# check-docs-drift.sh — fails if a backtick-quoted, path-shaped string in one
# of the mandatory-reading guides (CLAUDE.md, backend/CLAUDE.backend.md,
# frontend/CLAUDE.frontend.md) no longer exists on disk.
#
# This exists because of audit finding C-04: the guides are declared mandatory
# reading before writing any code, but drifted from the real codebase in 20+
# places (nonexistent directories, a stale config key that silently disabled
# caching, a stale route table, ...). This script does not catch every kind of
# drift — a description can still be wrong about a file that exists — but it
# catches the sharpest failure mode: a guide pointing at something that was
# renamed or deleted.
#
# Usage: scripts/check-docs-drift.sh

set -euo pipefail
set -f # disable globbing — token splitting below must not expand wildcards

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

guides=(
    "CLAUDE.md"
    "backend/CLAUDE.backend.md"
    "frontend/CLAUDE.frontend.md"
)

# Prose fragments that look path-shaped (contain a slash) but are naming-
# convention examples or illustrative snippets, not literal repo-relative
# paths — no combination of prefixes below resolves them to a real file.
# Keep this list short; prefer fixing the guide text (or the prefix list) over
# adding to it.
allowlist=(
    "ui/" "docs/"
    "filter/panel.tsx" "filter/panel.css" "video/card.tsx" "header/header.tsx"
    "palavra1/palavra2.tsx" "pasta/pasta.tsx" "componente/hook**"
    "react-hooks/set-state-in-effect" "react-hooks/exhaustive-deps" "react-hooks/refs"
    "Pusher/laravel-echo"
)

fail=0

is_allowlisted() {
    local token="$1" entry
    for entry in "${allowlist[@]}"; do
        [ "$token" = "$entry" ] && return 0
    done
    return 1
}

# is_path_shaped TOKEN — heuristic: only treat a token as a candidate
# filesystem path when it contains a slash and isn't obviously something else
# (an API route, an import alias, an env var interpolation, a glob/placeholder,
# a URL, a code snippet with quotes/parens, a numeric ratio like "5/min", a
# `Nome*Test.php` naming-convention placeholder, ...).
is_path_shaped() {
    local token="$1"

    case "$token" in
        */*) ;;
        *) return 1 ;;
    esac

    case "$token" in
        /* | @* | \$* | \.\./* | *'{'* | *'<'* | *'*'* | *'://'* | *"'"* | *'('* | *Nome*) return 1 ;;
    esac

    # bare numeric ratios like "5/min", "10/min", "6/min" — not a path
    if [[ "$token" =~ ^[0-9]+/[a-zA-Z]+$ ]]; then
        return 1
    fi

    return 0
}

check_path() {
    local raw="$1" guide="$2"
    shift 2
    local candidate="${raw%/}" prefix
    local tried="\"$candidate\""

    if [ -e "$candidate" ]; then
        return 0
    fi

    for prefix in "$@"; do
        [ -n "$prefix" ] || continue
        if [ -e "$prefix/$candidate" ]; then
            return 0
        fi
        tried="$tried, \"$prefix/$candidate\""
    done

    echo "DRIFT  $guide: \`$raw\` does not exist (tried $tried)"
    fail=1
}

for guide in "${guides[@]}"; do
    [ -f "$guide" ] || continue

    case "$guide" in
        backend/*) prefixes=("backend" "backend/app") ;;
        frontend/*) prefixes=("frontend" "frontend/src") ;;
        *) prefixes=() ;;
    esac

    # Extract inline single-backtick spans. Triple-backtick fenced blocks are
    # naturally skipped: within a single line, a fence delimiter (``` or an
    # unpaired `) can't satisfy the backtick...backtick lookaround below.
    while IFS= read -r span; do
        for token in $span; do
            token="${token%,}"
            token="${token%.}"
            token="${token%:}"
            token="${token%)}"

            [ -n "$token" ] || continue
            is_allowlisted "$token" && continue
            is_path_shaped "$token" || continue

            check_path "$token" "$guide" "${prefixes[@]}"
        done
    done < <(grep -oP '(?<=`)[^`]+(?=`)' "$guide")
done

if [ "$fail" -ne 0 ]; then
    echo ""
    echo "One or more paths referenced in the mandatory-reading guides do not exist on disk."
    echo "Either the guide text is stale (fix the guide) or the path was renamed/deleted"
    echo "without updating the guide (fix the guide)."
    exit 1
fi

echo "OK — every backtick-quoted path in the guides exists on disk."

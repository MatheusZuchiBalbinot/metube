/**
 * Shared sizing scale for UI primitives.
 *
 * Single source of truth for the `sm | md | lg` scale — both the runtime list
 * (`SIZES`, for iteration) and the `Size` type are derived from it, so the
 * literals are never re-declared across components.
 */
export const SIZES = ['sm', 'md', 'lg'] as const;

export type Size = typeof SIZES[number];

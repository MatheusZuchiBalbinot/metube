import type { SuggestionKind } from '@enums/suggestionKind';

export interface Suggestion {
    kind: SuggestionKind
    label: string
    value: string
    targetId: string
}

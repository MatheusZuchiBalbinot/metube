export const BoundaryLevel = {
    PAGE: 'page',
    SECTION: 'section',
    WIDGET: 'widget',
} as const;
export type BoundaryLevel = typeof BoundaryLevel[keyof typeof BoundaryLevel];

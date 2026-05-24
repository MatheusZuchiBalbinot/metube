export const SidebarTab = {
    RELATED: 'related',
    SUMMARY: 'summary',
} as const;

export type SidebarTab = typeof SidebarTab[keyof typeof SidebarTab];

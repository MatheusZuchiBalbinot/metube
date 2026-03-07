const PALETTES = [
    { bg: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa' },   // violet
    { bg: 'rgba(37, 99, 235, 0.15)',  color: '#60a5fa' },    // blue
    { bg: 'rgba(5, 150, 105, 0.15)',  color: '#34d399' },    // emerald
    { bg: 'rgba(225, 29, 72, 0.15)',  color: '#fb7185' },    // rose
    { bg: 'rgba(217, 119, 6, 0.15)',  color: '#fbbf24' },    // amber
    { bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' },    // pink
    { bg: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' },    // sky
    { bg: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf' },    // teal
    { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' },    // purple
    { bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' },    // orange
    { bg: 'rgba(239, 68, 68, 0.15)',  color: '#f87171' },    // red
    { bg: 'rgba(132, 204, 22, 0.15)', color: '#a3e635' },    // lime
] as const;

export type TagPalette = typeof PALETTES[number];

export class TagColors {
    static palette(tag: string): TagPalette {
        let hash = 0;
        for (let i = 0; i < tag.length; i++) {
            hash = (hash * 31 + tag.charCodeAt(i)) | 0;
        }
        return PALETTES[Math.abs(hash) % PALETTES.length];
    }
}

export type Tag = string & { readonly _brand: 'Tag' };

/** Tag com metadados — usado no FilterPanel para mostrar contagem */
export interface TagMeta {
    tag: Tag
    count: number
}

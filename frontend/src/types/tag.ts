export type Tag = string & { readonly _brand: 'Tag' };

export interface TagMeta {
    tag: Tag
    count: number
}

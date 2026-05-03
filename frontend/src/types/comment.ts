export type Cuid = string & { readonly _brand: 'Cuid' };

export interface CommentAuthor {
    uuid: string
    name: string
    avatar: string
}

export interface Comment {
    id: Cuid
    content: string
    author: CommentAuthor
    createdAt: string
    updatedAt?: string
    likesCount: number
    isLiked: boolean
    replyCount: number
    parentCuid?: Cuid
}

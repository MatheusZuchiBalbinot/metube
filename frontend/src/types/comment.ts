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
    isEdited: boolean
    likesCount: number
    isLiked: boolean
    replyCount: number
    parentCuid?: Cuid
}

export interface CommentVersion {
    version: number
    content: string
    createdAt: string
}

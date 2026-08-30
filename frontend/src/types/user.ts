export type UserId = string & { readonly _brand: 'UserId' };

export interface User {
    id: UserId
    uuid: string
    name: string
    email: string
    bio?: string
    avatar?: string
    emailVerifiedAt?: string
    createdAt: string
}

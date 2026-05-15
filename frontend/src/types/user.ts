export type UserId = number & { readonly _brand: 'UserId' };

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

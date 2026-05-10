export type UserId = number & { readonly _brand: 'UserId' };

export interface User {
    id: UserId
    name: string
    email: string
    bio?: string
    avatar?: string
    createdAt: string
}

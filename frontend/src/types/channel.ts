export type ChannelId = string & { readonly _brand: 'ChannelId' };

export interface Channel {
    id: ChannelId
    name: string
    avatar?: string
    description?: string
    subscriberCount?: number
}

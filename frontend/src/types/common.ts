export interface PaginatedResponse<T> {
    data: T[]
    meta: {
        total: number
        page: number
        perPage: number
        lastPage: number
    }
}

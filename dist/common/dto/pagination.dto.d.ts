export declare class PaginationDto {
    page: number;
    limit: number;
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

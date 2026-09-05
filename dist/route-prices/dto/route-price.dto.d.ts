export declare class CreateRoutePriceDto {
    tourId: string;
    providerId: string;
    vehicleId: string;
    price: number;
}
export declare class UpdateRoutePriceDto {
    tourId?: string;
    providerId?: string;
    vehicleId?: string;
    price?: number;
}
export declare class QueryRoutePriceDto {
    page?: number;
    limit?: number;
    tourId?: string;
    providerId?: string;
    vehicleId?: string;
}

export declare class CreateCoordinateDto {
    hotelName: string;
    starRating?: string;
    address: string;
    coordinate?: string;
    latitude: number;
    longitude: number;
}
export declare class UpdateCoordinateDto {
    hotelName?: string;
    starRating?: string;
    address?: string;
    coordinate?: string;
    latitude?: number;
    longitude?: number;
}
export declare class QueryCoordinateDto {
    page?: number;
    limit?: number;
    q?: string;
}

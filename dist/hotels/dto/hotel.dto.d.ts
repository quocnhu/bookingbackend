export declare class CreateHotelDto {
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    commissionPercent: number;
    isActive?: boolean;
    accountEmail?: string;
    accountPassword?: string;
    accountName?: string;
}
export declare class UpdateHotelDto {
    name?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    commissionPercent?: number;
    isActive?: boolean;
    accountEmail?: string;
    accountPassword?: string;
    accountName?: string;
}
export declare class QueryHotelBookingsDto {
    page?: number;
    pageSize?: number;
    search?: string;
    payment?: string;
    fromDate?: string;
    toDate?: string;
}

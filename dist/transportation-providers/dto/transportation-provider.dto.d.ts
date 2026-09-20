export declare class CreateTransportationVehicleDto {
    providerId: string;
    plateNumber: string;
    capacity?: number;
    brand?: string;
}
export declare class UpdateTransportationVehicleDto {
    providerId?: string;
    plateNumber?: string;
    capacity?: number;
    brand?: string;
}
export declare class AssignDriverToProviderDto {
    userId: string;
}
export declare class CreateDriverDto {
    name: string;
    email: string;
    licenseNumber: string;
    providerId?: string;
}
export declare class UpdateDriverDto {
    name?: string;
    email?: string;
    licenseNumber?: string;
    isActive?: boolean;
}

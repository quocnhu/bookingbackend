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

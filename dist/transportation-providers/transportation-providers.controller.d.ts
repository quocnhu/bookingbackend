import { TransportationProvidersService } from './transportation-providers.service';
import { AssignDriverToProviderDto, CreateTransportationProviderDto, CreateTransportationVehicleDto, UpdateTransportationVehicleDto } from './dto/transportation-provider.dto';
export declare class TransportationProvidersController {
    private readonly transportationProvidersService;
    constructor(transportationProvidersService: TransportationProvidersService);
    findAll(): Promise<{
        id: string;
        name: string;
        contact: any;
        vehicles: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        }[];
        drivers: any[];
    }[]>;
    createProvider(dto: CreateTransportationProviderDto): Promise<{
        provider: {
            id: string;
            name: string;
        };
        user: {
            role: import("@prisma/client").$Enums.RoleType;
            id: string;
            name: string | null;
            email: string;
            isActive: boolean;
            providerId: string | null;
        };
        defaultPassword: string | undefined;
    }>;
    findAllDrivers(): Promise<{
        id: string;
        name: string | null;
        email: string;
        isActive: boolean;
        providerId: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        contact: any;
        vehicles: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        }[];
        drivers: any[];
    }>;
    createVehicle(dto: CreateTransportationVehicleDto): Promise<{
        id: string;
        providerId: string;
        plateNumber: string;
        capacity: number | null;
        brand: string | null;
    }>;
    updateVehicle(id: string, dto: UpdateTransportationVehicleDto): Promise<{
        id: string;
        providerId: string;
        plateNumber: string;
        capacity: number | null;
        brand: string | null;
    }>;
    deleteVehicle(id: string): Promise<{
        message: string;
    }>;
    assignDriver(providerId: string, dto: AssignDriverToProviderDto): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        id: string;
        name: string | null;
        email: string;
        providerId: string | null;
    }>;
    unassignDriver(providerId: string, userId: string): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        id: string;
        name: string | null;
        email: string;
        providerId: string | null;
    }>;
}

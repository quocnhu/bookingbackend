import { TransportationProvidersService } from './transportation-providers.service';
import { AssignDriverToProviderDto, CreateDriverDto, CreateTransportationVehicleDto, UpdateDriverDto, UpdateTransportationVehicleDto } from './dto/transportation-provider.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class TransportationProvidersController {
    private readonly transportationProvidersService;
    constructor(transportationProvidersService: TransportationProvidersService);
    findAll(actor: AuthenticatedUser): Promise<{
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
    findAllDrivers(actor: AuthenticatedUser): Promise<{
        id: any;
        name: any;
        email: any;
        isActive: any;
        providerId: any;
        licenseNumber: any;
    }[]>;
    findOne(id: string, actor: AuthenticatedUser): Promise<{
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
    createDriver(dto: CreateDriverDto, actor: AuthenticatedUser): Promise<{
        defaultPassword: string;
        id: any;
        name: any;
        email: any;
        isActive: any;
        providerId: any;
        licenseNumber: any;
    }>;
    updateDriver(id: string, dto: UpdateDriverDto, actor: AuthenticatedUser): Promise<{
        id: any;
        name: any;
        email: any;
        isActive: any;
        providerId: any;
        licenseNumber: any;
    }>;
    createVehicle(dto: CreateTransportationVehicleDto, actor: AuthenticatedUser): Promise<{
        id: string;
        providerId: string;
        plateNumber: string;
        capacity: number | null;
        brand: string | null;
    }>;
    updateVehicle(id: string, dto: UpdateTransportationVehicleDto, actor: AuthenticatedUser): Promise<{
        id: string;
        providerId: string;
        plateNumber: string;
        capacity: number | null;
        brand: string | null;
    }>;
    deleteVehicle(id: string, actor: AuthenticatedUser): Promise<{
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

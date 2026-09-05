import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AssignDriverToProviderDto, CreateTransportationProviderDto, CreateTransportationVehicleDto, UpdateTransportationVehicleDto } from './dto/transportation-provider.dto';
export declare class TransportationProvidersService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    private personSelect;
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
    findAllDrivers(): Promise<{
        id: string;
        name: string | null;
        email: string;
        isActive: boolean;
        providerId: string | null;
    }[]>;
    private ensureProviderOrFail;
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

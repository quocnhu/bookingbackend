import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { AssignDriverToProviderDto, CreateDriverDto, CreateTransportationVehicleDto, UpdateDriverDto, UpdateTransportationVehicleDto } from './dto/transportation-provider.dto';
export declare class TransportationProvidersService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    private personSelect;
    private driverSelect;
    private toDriverView;
    private isProvider;
    private providerScope;
    private requireProviderId;
    findAll(actor?: AuthenticatedUser): Promise<{
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
    findOne(id: string, actor?: AuthenticatedUser): Promise<{
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
    findAllDrivers(actor?: AuthenticatedUser): Promise<{
        id: any;
        name: any;
        email: any;
        isActive: any;
        providerId: any;
        licenseNumber: any;
    }[]>;
    createDriver(actor: AuthenticatedUser, dto: CreateDriverDto): Promise<{
        defaultPassword: string;
        id: any;
        name: any;
        email: any;
        isActive: any;
        providerId: any;
        licenseNumber: any;
    }>;
    updateDriver(actor: AuthenticatedUser, id: string, dto: UpdateDriverDto): Promise<{
        id: any;
        name: any;
        email: any;
        isActive: any;
        providerId: any;
        licenseNumber: any;
    }>;
    private ensureProviderOrFail;
    createVehicle(actor: AuthenticatedUser, dto: CreateTransportationVehicleDto): Promise<{
        id: string;
        providerId: string;
        plateNumber: string;
        capacity: number | null;
        brand: string | null;
    }>;
    updateVehicle(actor: AuthenticatedUser, id: string, dto: UpdateTransportationVehicleDto): Promise<{
        id: string;
        providerId: string;
        plateNumber: string;
        capacity: number | null;
        brand: string | null;
    }>;
    deleteVehicle(actor: AuthenticatedUser, id: string): Promise<{
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

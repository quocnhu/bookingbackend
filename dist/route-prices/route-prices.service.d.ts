import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateRoutePriceDto, QueryRoutePriceDto, UpdateRoutePriceDto } from './dto/route-price.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
export declare class RoutePricesService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    private routeInclude;
    private isProvider;
    private providerScope;
    private requireProviderId;
    findAll(query: QueryRoutePriceDto, actor?: AuthenticatedUser): Promise<PaginatedResult<any>>;
    getDropdownData(actor?: AuthenticatedUser): Promise<{
        providers: {
            id: string;
            name: string;
            vehicles: {
                id: string;
                plateNumber: string;
                capacity: number | null;
                brand: string | null;
            }[];
        }[];
        tours: {
            id: string;
            name: string;
        }[];
    }>;
    getAssignable(actor?: AuthenticatedUser): Promise<{
        providerId: string;
        providerName: string;
        vehicleId: string;
        capacity: number | null;
        plateNumber: string;
        brand: string | null;
        tourId: string;
        tourName: string;
        durationDays: number;
        price: number;
    }[]>;
    findOne(id: string): Promise<{
        tour: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            name: string;
            code: string;
            thumbnailUrl: string | null;
            durationDays: number | null;
            adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            childPrice: import("@prisma/client/runtime/library").Decimal | null;
            infantPrice: import("@prisma/client/runtime/library").Decimal | null;
            currency: string;
            privateDiscountPercent: number | null;
            groupDiscountPercent: number | null;
            promotionStartsAt: Date | null;
            promotionEndsAt: Date | null;
            departureLocation: string | null;
            transportation: string | null;
            overview: string | null;
            highlights: string | null;
            includedServices: string | null;
            excludedServices: string | null;
            childrenPolicy: string | null;
            regulations: string | null;
            insurancePolicy: string | null;
            mapQuery: string | null;
        };
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        };
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        };
    } & {
        id: string;
        providerId: string;
        tourId: string;
        vehicleId: string;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    create(actor: AuthenticatedUser, dto: CreateRoutePriceDto): Promise<{
        tour: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            name: string;
            code: string;
            thumbnailUrl: string | null;
            durationDays: number | null;
            adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            childPrice: import("@prisma/client/runtime/library").Decimal | null;
            infantPrice: import("@prisma/client/runtime/library").Decimal | null;
            currency: string;
            privateDiscountPercent: number | null;
            groupDiscountPercent: number | null;
            promotionStartsAt: Date | null;
            promotionEndsAt: Date | null;
            departureLocation: string | null;
            transportation: string | null;
            overview: string | null;
            highlights: string | null;
            includedServices: string | null;
            excludedServices: string | null;
            childrenPolicy: string | null;
            regulations: string | null;
            insurancePolicy: string | null;
            mapQuery: string | null;
        };
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        };
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        };
    } & {
        id: string;
        providerId: string;
        tourId: string;
        vehicleId: string;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    update(actor: AuthenticatedUser, id: string, dto: UpdateRoutePriceDto): Promise<{
        tour: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            name: string;
            code: string;
            thumbnailUrl: string | null;
            durationDays: number | null;
            adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            childPrice: import("@prisma/client/runtime/library").Decimal | null;
            infantPrice: import("@prisma/client/runtime/library").Decimal | null;
            currency: string;
            privateDiscountPercent: number | null;
            groupDiscountPercent: number | null;
            promotionStartsAt: Date | null;
            promotionEndsAt: Date | null;
            departureLocation: string | null;
            transportation: string | null;
            overview: string | null;
            highlights: string | null;
            includedServices: string | null;
            excludedServices: string | null;
            childrenPolicy: string | null;
            regulations: string | null;
            insurancePolicy: string | null;
            mapQuery: string | null;
        };
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        };
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        };
    } & {
        id: string;
        providerId: string;
        tourId: string;
        vehicleId: string;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    private assertVehicleBelongsToProvider;
    remove(id: string): Promise<{
        message: string;
    }>;
}

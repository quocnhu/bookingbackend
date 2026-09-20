import { RoutePricesService } from './route-prices.service';
import { CreateRoutePriceDto, QueryRoutePriceDto, UpdateRoutePriceDto } from './dto/route-price.dto';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
export declare class RoutePricesController {
    private readonly routePricesService;
    constructor(routePricesService: RoutePricesService);
    findAll(query: QueryRoutePriceDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    getDropdownData(actor: AuthenticatedUser): Promise<{
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
    getAssignable(actor: AuthenticatedUser): Promise<{
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
            id: string;
            name: string;
            code: string;
            durationDays: number | null;
            type: import("@prisma/client").$Enums.TourType;
            thumbnailUrl: string | null;
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
            includedServices: string | null;
            excludedServices: string | null;
            childrenPolicy: string | null;
            regulations: string | null;
            highlights: string | null;
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
        };
    } & {
        id: string;
        tourId: string;
        vehicleId: string;
        providerId: string;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    create(dto: CreateRoutePriceDto, actor: AuthenticatedUser): Promise<{
        tour: {
            id: string;
            name: string;
            code: string;
            durationDays: number | null;
            type: import("@prisma/client").$Enums.TourType;
            thumbnailUrl: string | null;
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
            includedServices: string | null;
            excludedServices: string | null;
            childrenPolicy: string | null;
            regulations: string | null;
            highlights: string | null;
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
        };
    } & {
        id: string;
        tourId: string;
        vehicleId: string;
        providerId: string;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    update(id: string, dto: UpdateRoutePriceDto, actor: AuthenticatedUser): Promise<{
        tour: {
            id: string;
            name: string;
            code: string;
            durationDays: number | null;
            type: import("@prisma/client").$Enums.TourType;
            thumbnailUrl: string | null;
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
            includedServices: string | null;
            excludedServices: string | null;
            childrenPolicy: string | null;
            regulations: string | null;
            highlights: string | null;
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
        };
    } & {
        id: string;
        tourId: string;
        vehicleId: string;
        providerId: string;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}

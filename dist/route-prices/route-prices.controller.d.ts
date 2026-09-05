import { RoutePricesService } from './route-prices.service';
import { CreateRoutePriceDto, QueryRoutePriceDto, UpdateRoutePriceDto } from './dto/route-price.dto';
export declare class RoutePricesController {
    private readonly routePricesService;
    constructor(routePricesService: RoutePricesService);
    findAll(query: QueryRoutePriceDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    getDropdownData(): Promise<{
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
            discountPercent: number | null;
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
        };
    } & {
        id: string;
        providerId: string;
        tourId: string;
        vehicleId: string;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    create(dto: CreateRoutePriceDto): Promise<{
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
            discountPercent: number | null;
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
        };
    } & {
        id: string;
        providerId: string;
        tourId: string;
        vehicleId: string;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    update(id: string, dto: UpdateRoutePriceDto): Promise<{
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
            discountPercent: number | null;
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
        };
    } & {
        id: string;
        providerId: string;
        tourId: string;
        vehicleId: string;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}

import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { FileStorage } from '@/storage';
import { CreateTourDto, QueryTourDto, UpdateItineraryDto, UpdateTourDto } from './dto/tour.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
export declare class ToursService {
    private readonly prisma;
    private readonly auditService;
    private readonly storage;
    constructor(prisma: PrismaService, auditService: AuditService, storage: FileStorage);
    findAll(query: QueryTourDto): Promise<PaginatedResult<any>>;
    findOne(id: string): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        itineraries: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            mapQuery: string | null;
            description: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
        }[];
        typePrices: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        }[];
        prices: ({
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
        })[];
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
    }>;
    create(dto: CreateTourDto): Promise<{
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
    }>;
    private generateTourCode;
    update(id: string, dto: UpdateTourDto): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        itineraries: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            mapQuery: string | null;
            description: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
        }[];
        typePrices: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        }[];
        prices: ({
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
        })[];
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
    }>;
    updateItinerary(id: string, dto: UpdateItineraryDto, changedBy: string): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        itineraries: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            mapQuery: string | null;
            description: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
        }[];
        typePrices: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        }[];
        prices: ({
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
        })[];
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
    }>;
    private galleryPrefix;
    private listGallery;
    uploadGallery(tourId: string, file: Express.Multer.File, changedBy: string): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        itineraries: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            mapQuery: string | null;
            description: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
        }[];
        typePrices: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        }[];
        prices: ({
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
        })[];
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
    }>;
    deleteGallery(tourId: string, file: string, changedBy: string): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        itineraries: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            mapQuery: string | null;
            description: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
        }[];
        typePrices: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        }[];
        prices: ({
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
        })[];
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
    }>;
    reorderGallery(tourId: string, files: string[]): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        itineraries: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            mapQuery: string | null;
            description: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
        }[];
        typePrices: {
            id: string;
            tourId: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        }[];
        prices: ({
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
        })[];
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
    }>;
    remove(id: string, changedBy: string): Promise<{
        message: string;
    }>;
}

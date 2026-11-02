import { Prisma } from '@prisma/client';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { FileStorage } from "../storage";
import { CreateTourDto, QueryTourDto, UpdateItineraryDto, UpdateTourDto } from './dto/tour.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
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
        typePrices: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            adultPrice: Prisma.Decimal;
            childPrice: Prisma.Decimal;
            infantPrice: Prisma.Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pax: number;
            pricePerPerson: Prisma.Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            mapQuery: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
            tourId: string;
        }[];
        prices: ({
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: Prisma.Decimal;
        })[];
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        type: import("@prisma/client").$Enums.TourType;
        id: string;
        name: string;
        code: string;
        durationDays: number | null;
        currency: string;
        requiresGuide: boolean;
        thumbnailUrl: string | null;
        departureTimes: string[];
        durationValue: number | null;
        durationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationValue: number | null;
        freeCancellationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationHours: number | null;
        cancellationPolicy: string | null;
        adultPrice: Prisma.Decimal | null;
        childPrice: Prisma.Decimal | null;
        infantPrice: Prisma.Decimal | null;
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
        slug: string | null;
    }>;
    findBySlug(slug: string): Promise<{
        slug: string;
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            adultPrice: Prisma.Decimal;
            childPrice: Prisma.Decimal;
            infantPrice: Prisma.Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pax: number;
            pricePerPerson: Prisma.Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            mapQuery: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
            tourId: string;
        }[];
        prices: ({
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: Prisma.Decimal;
        })[];
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        type: import("@prisma/client").$Enums.TourType;
        id: string;
        name: string;
        code: string;
        durationDays: number | null;
        currency: string;
        requiresGuide: boolean;
        thumbnailUrl: string | null;
        departureTimes: string[];
        durationValue: number | null;
        durationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationValue: number | null;
        freeCancellationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationHours: number | null;
        cancellationPolicy: string | null;
        adultPrice: Prisma.Decimal | null;
        childPrice: Prisma.Decimal | null;
        infantPrice: Prisma.Decimal | null;
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
    }>;
    create(dto: CreateTourDto): Promise<{
        type: import("@prisma/client").$Enums.TourType;
        id: string;
        name: string;
        code: string;
        durationDays: number | null;
        currency: string;
        requiresGuide: boolean;
        thumbnailUrl: string | null;
        departureTimes: string[];
        durationValue: number | null;
        durationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationValue: number | null;
        freeCancellationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationHours: number | null;
        cancellationPolicy: string | null;
        adultPrice: Prisma.Decimal | null;
        childPrice: Prisma.Decimal | null;
        infantPrice: Prisma.Decimal | null;
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
        slug: string | null;
    }>;
    private generateTourCode;
    private normalizeDepartureTimes;
    private resolveDurationDays;
    private filterOfferedTypePrices;
    private normalizePrivatePaxPrices;
    private withPrivatePaxMirror;
    private resolveCategoryLinks;
    private resolveFreeCancellation;
    update(id: string, dto: UpdateTourDto): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            adultPrice: Prisma.Decimal;
            childPrice: Prisma.Decimal;
            infantPrice: Prisma.Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pax: number;
            pricePerPerson: Prisma.Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            mapQuery: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
            tourId: string;
        }[];
        prices: ({
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: Prisma.Decimal;
        })[];
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        type: import("@prisma/client").$Enums.TourType;
        id: string;
        name: string;
        code: string;
        durationDays: number | null;
        currency: string;
        requiresGuide: boolean;
        thumbnailUrl: string | null;
        departureTimes: string[];
        durationValue: number | null;
        durationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationValue: number | null;
        freeCancellationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationHours: number | null;
        cancellationPolicy: string | null;
        adultPrice: Prisma.Decimal | null;
        childPrice: Prisma.Decimal | null;
        infantPrice: Prisma.Decimal | null;
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
        slug: string | null;
    }>;
    private nextSlug;
    updateItinerary(id: string, dto: UpdateItineraryDto, changedBy: string): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            adultPrice: Prisma.Decimal;
            childPrice: Prisma.Decimal;
            infantPrice: Prisma.Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pax: number;
            pricePerPerson: Prisma.Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            mapQuery: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
            tourId: string;
        }[];
        prices: ({
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: Prisma.Decimal;
        })[];
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        type: import("@prisma/client").$Enums.TourType;
        id: string;
        name: string;
        code: string;
        durationDays: number | null;
        currency: string;
        requiresGuide: boolean;
        thumbnailUrl: string | null;
        departureTimes: string[];
        durationValue: number | null;
        durationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationValue: number | null;
        freeCancellationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationHours: number | null;
        cancellationPolicy: string | null;
        adultPrice: Prisma.Decimal | null;
        childPrice: Prisma.Decimal | null;
        infantPrice: Prisma.Decimal | null;
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
        slug: string | null;
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
        typePrices: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            adultPrice: Prisma.Decimal;
            childPrice: Prisma.Decimal;
            infantPrice: Prisma.Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pax: number;
            pricePerPerson: Prisma.Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            mapQuery: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
            tourId: string;
        }[];
        prices: ({
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: Prisma.Decimal;
        })[];
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        type: import("@prisma/client").$Enums.TourType;
        id: string;
        name: string;
        code: string;
        durationDays: number | null;
        currency: string;
        requiresGuide: boolean;
        thumbnailUrl: string | null;
        departureTimes: string[];
        durationValue: number | null;
        durationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationValue: number | null;
        freeCancellationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationHours: number | null;
        cancellationPolicy: string | null;
        adultPrice: Prisma.Decimal | null;
        childPrice: Prisma.Decimal | null;
        infantPrice: Prisma.Decimal | null;
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
        slug: string | null;
    }>;
    deleteGallery(tourId: string, file: string, changedBy: string): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            adultPrice: Prisma.Decimal;
            childPrice: Prisma.Decimal;
            infantPrice: Prisma.Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pax: number;
            pricePerPerson: Prisma.Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            mapQuery: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
            tourId: string;
        }[];
        prices: ({
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: Prisma.Decimal;
        })[];
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        type: import("@prisma/client").$Enums.TourType;
        id: string;
        name: string;
        code: string;
        durationDays: number | null;
        currency: string;
        requiresGuide: boolean;
        thumbnailUrl: string | null;
        departureTimes: string[];
        durationValue: number | null;
        durationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationValue: number | null;
        freeCancellationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationHours: number | null;
        cancellationPolicy: string | null;
        adultPrice: Prisma.Decimal | null;
        childPrice: Prisma.Decimal | null;
        infantPrice: Prisma.Decimal | null;
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
        slug: string | null;
    }>;
    reorderGallery(tourId: string, files: string[]): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            adultPrice: Prisma.Decimal;
            childPrice: Prisma.Decimal;
            infantPrice: Prisma.Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pax: number;
            pricePerPerson: Prisma.Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            mapQuery: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            imageUrl: string | null;
            tourId: string;
        }[];
        prices: ({
            provider: {
                id: string;
                name: string;
                isCompany: boolean;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: Prisma.Decimal;
        })[];
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        type: import("@prisma/client").$Enums.TourType;
        id: string;
        name: string;
        code: string;
        durationDays: number | null;
        currency: string;
        requiresGuide: boolean;
        thumbnailUrl: string | null;
        departureTimes: string[];
        durationValue: number | null;
        durationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationValue: number | null;
        freeCancellationUnit: import("@prisma/client").$Enums.DurationUnit | null;
        freeCancellationHours: number | null;
        cancellationPolicy: string | null;
        adultPrice: Prisma.Decimal | null;
        childPrice: Prisma.Decimal | null;
        infantPrice: Prisma.Decimal | null;
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
        slug: string | null;
    }>;
    remove(id: string, changedBy: string): Promise<{
        message: string;
    }>;
}

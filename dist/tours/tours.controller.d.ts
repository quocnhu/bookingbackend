import { ToursService } from './tours.service';
import { CreateTourDto, QueryTourDto, ReorderGalleryDto, UpdateItineraryDto, UpdateTourDto } from './dto/tour.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class ToursController {
    private readonly toursService;
    constructor(toursService: ToursService);
    findAll(query: QueryTourDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findBySlug(slug: string): Promise<{
        slug: string;
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            currency: string;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
            pax: number;
            pricePerPerson: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
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
                name: string;
                id: string;
                isCompany: boolean;
                assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
        categories: ({
            category: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                isActive: boolean;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        id: string;
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
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
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
    findOne(id: string): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            currency: string;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
            pax: number;
            pricePerPerson: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
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
                name: string;
                id: string;
                isCompany: boolean;
                assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
        categories: ({
            category: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                isActive: boolean;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        id: string;
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
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
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
    create(dto: CreateTourDto): Promise<{
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        id: string;
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
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
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
    update(id: string, dto: UpdateTourDto): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            currency: string;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
            pax: number;
            pricePerPerson: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
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
                name: string;
                id: string;
                isCompany: boolean;
                assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
        categories: ({
            category: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                isActive: boolean;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        id: string;
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
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
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
    updateItinerary(id: string, dto: UpdateItineraryDto, user: AuthenticatedUser): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            currency: string;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
            pax: number;
            pricePerPerson: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
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
                name: string;
                id: string;
                isCompany: boolean;
                assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
        categories: ({
            category: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                isActive: boolean;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        id: string;
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
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
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
    uploadMedia(id: string, file: Express.Multer.File, user: AuthenticatedUser): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            currency: string;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
            pax: number;
            pricePerPerson: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
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
                name: string;
                id: string;
                isCompany: boolean;
                assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
        categories: ({
            category: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                isActive: boolean;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        id: string;
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
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
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
    reorderGallery(id: string, dto: ReorderGalleryDto): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            currency: string;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
            pax: number;
            pricePerPerson: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
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
                name: string;
                id: string;
                isCompany: boolean;
                assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
        categories: ({
            category: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                isActive: boolean;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        id: string;
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
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
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
    deleteMedia(id: string, file: string, user: AuthenticatedUser): Promise<{
        gallery: {
            id: string;
            url: string;
            storageKey: string;
            sortIndex: number;
        }[];
        typePrices: {
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TourType;
            id: string;
            createdAt: Date;
            currency: string;
            adultPrice: import("@prisma/client/runtime/library").Decimal;
            childPrice: import("@prisma/client/runtime/library").Decimal;
            infantPrice: import("@prisma/client/runtime/library").Decimal;
            tourId: string;
        }[];
        privatePaxPrices: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
            pax: number;
            pricePerPerson: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            tourId: string;
        }[];
        itineraries: {
            updatedAt: Date;
            id: string;
            createdAt: Date;
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
                name: string;
                id: string;
                isCompany: boolean;
                assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
            };
        } & {
            id: string;
            providerId: string;
            vehicleId: string;
            tourId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
        categories: ({
            category: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                isActive: boolean;
                description: string | null;
                slug: string;
                sortOrder: number;
            };
        } & {
            tourId: string;
            categoryId: string;
            isPrimary: boolean;
        })[];
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        id: string;
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
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
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
    remove(id: string, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
}

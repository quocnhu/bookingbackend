import { ToursService } from './tours.service';
import { CreateTourDto, QueryTourDto, UpdateItineraryDto, UpdateTourDto } from './dto/tour.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class ToursController {
    private readonly toursService;
    constructor(toursService: ToursService);
    findAll(query: QueryTourDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findOne(id: string): Promise<{
        _count: {
            bookings: number;
        };
        itineraries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            tourId: string;
        }[];
        prices: ({
            provider: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            providerId: string;
            tourId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
    } & {
        id: string;
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        code: string;
        thumbnailUrl: string | null;
        durationDays: number | null;
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
        currency: string;
    }>;
    create(dto: CreateTourDto): Promise<{
        id: string;
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        code: string;
        thumbnailUrl: string | null;
        durationDays: number | null;
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
        currency: string;
    }>;
    update(id: string, dto: UpdateTourDto): Promise<{
        id: string;
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        code: string;
        thumbnailUrl: string | null;
        durationDays: number | null;
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
        currency: string;
    }>;
    updateItinerary(id: string, dto: UpdateItineraryDto, user: AuthenticatedUser): Promise<{
        _count: {
            bookings: number;
        };
        itineraries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            dayNumber: number;
            orderIndex: number;
            title: string;
            timeSlot: string | null;
            location: string | null;
            tourId: string;
        }[];
        prices: ({
            provider: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            providerId: string;
            tourId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
    } & {
        id: string;
        name: string;
        type: import("@prisma/client").$Enums.TourType;
        code: string;
        thumbnailUrl: string | null;
        durationDays: number | null;
        adultPrice: import("@prisma/client/runtime/library").Decimal | null;
        childPrice: import("@prisma/client/runtime/library").Decimal | null;
        infantPrice: import("@prisma/client/runtime/library").Decimal | null;
        currency: string;
    }>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
}

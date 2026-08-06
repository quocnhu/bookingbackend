import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateTourDto, QueryTourDto, UpdateItineraryDto, UpdateTourDto } from './dto/tour.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
export declare class ToursService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    findAll(query: QueryTourDto): Promise<PaginatedResult<any>>;
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
    private generateTourCode;
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
    updateItinerary(id: string, dto: UpdateItineraryDto, changedBy: string): Promise<{
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
    remove(id: string, changedBy: string): Promise<{
        message: string;
    }>;
}

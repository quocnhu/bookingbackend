import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateHotelDto, QueryHotelBookingsDto, UpdateHotelDto } from './dto/hotel.dto';
export declare class HotelsService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    list(): Promise<{
        commissionPercent: number;
        bookingsCount: number;
        _count: {
            bookings: number;
        };
        users: {
            name: string | null;
            id: string;
            email: string;
            isActive: boolean;
        }[];
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        phone: string | null;
        contactName: string | null;
    }[]>;
    publicList(): Promise<{
        name: string;
        id: string;
        address: string | null;
    }[]>;
    create(dto: CreateHotelDto, actor: AuthenticatedUser): Promise<{
        commissionPercent: number;
        bookingsCount: number;
        _count: {
            bookings: number;
        };
        users: {
            name: string | null;
            id: string;
            email: string;
            isActive: boolean;
        }[];
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        phone: string | null;
        contactName: string | null;
    }>;
    update(id: string, dto: UpdateHotelDto, actor: AuthenticatedUser): Promise<{
        commissionPercent: number;
        bookingsCount: number;
        _count: {
            bookings: number;
        };
        users: {
            name: string | null;
            id: string;
            email: string;
            isActive: boolean;
        }[];
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        phone: string | null;
        contactName: string | null;
    }>;
    remove(id: string, actor: AuthenticatedUser): Promise<{
        deactivated: boolean;
        deleted?: undefined;
    } | {
        deleted: boolean;
        deactivated?: undefined;
    }>;
    dashboard(actor: AuthenticatedUser, requestedHotelId?: string): Promise<{
        hotel: {
            id: string;
            name: string;
            commissionPercent: number;
        };
        totals: {
            tours: number;
            bookings: number;
            pax: number;
            revenue: number;
            earned: number;
            pending: number;
        };
        byTour: {
            tourId: string | null;
            tourName: string;
            bookings: number;
            pax: number;
            revenue: number;
            earned: number;
            pending: number;
        }[];
        recentBookings: {
            id: string;
            bookingRef: string;
            customerName: string | null;
            hotelName: string;
            startingDate: Date | null;
            totalPax: number;
            totalAmount: number;
            currency: string;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            assignmentStatus: import("@prisma/client").$Enums.AssignmentStatus | null;
            tourId: string | null;
            tourName: string | null;
            commissionPercent: number;
            commissionAmount: number;
            commissionEarned: boolean;
        }[];
    }>;
    bookings(actor: AuthenticatedUser, query: QueryHotelBookingsDto, requestedHotelId?: string): Promise<{
        items: {
            id: string;
            bookingRef: string;
            customerName: string | null;
            hotelName: string;
            startingDate: Date | null;
            totalPax: number;
            totalAmount: number;
            currency: string;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            assignmentStatus: import("@prisma/client").$Enums.AssignmentStatus | null;
            tourId: string | null;
            tourName: string | null;
            commissionPercent: number;
            commissionAmount: number;
            commissionEarned: boolean;
        }[];
        total: number;
        page: number;
        pageSize: number;
        summary: {
            bookings: number;
            pax: number;
            revenue: number;
            earned: number;
            pending: number;
        };
    }>;
    private findOne;
    private resolveHotel;
    private bookingSelect;
    private loadBookings;
    private mapBooking;
    private sumRows;
    private summarize;
}

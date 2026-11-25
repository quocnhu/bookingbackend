import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { HotelsService } from './hotels.service';
import { CreateHotelDto, QueryHotelBookingsDto, UpdateHotelDto } from './dto/hotel.dto';
export declare class HotelsController {
    private readonly hotels;
    constructor(hotels: HotelsService);
    publicList(): Promise<{
        name: string;
        id: string;
        address: string | null;
    }[]>;
    myDashboard(actor: AuthenticatedUser, hotelId?: string): Promise<{
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
    myBookings(actor: AuthenticatedUser, query: QueryHotelBookingsDto, hotelId?: string): Promise<{
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
}

import { PaginationDto } from "../../common/dto/pagination.dto";
import { BookingProvider, BookingStatus, PaymentStatus, TourType } from '@prisma/client';
export declare class CreateBookingDto {
    bookingRef?: string;
    source?: string;
    confirmationCode?: string;
    channel?: BookingProvider;
    status?: BookingStatus;
    tourId?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    startingDate?: string | Date;
    customerName?: string;
    hotelName: string;
    phone: string;
    mail?: string;
    totalPax?: number;
    paxDetail?: string;
    tourType?: TourType;
    tourName?: string;
    payment?: PaymentStatus;
    isNoShow?: boolean;
    noShowReason?: string;
}
export declare class UpdateBookingDto {
    status?: BookingStatus;
    tourId?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    startingDate?: string | Date;
    customerName?: string;
    hotelName?: string;
    phone?: string;
    mail?: string;
    totalPax?: number;
    paxDetail?: string;
    tourType?: TourType;
    tourName?: string;
    payment?: PaymentStatus;
    isNoShow?: boolean;
    noShowReason?: string;
    notes?: string;
    collectAmount?: number | null;
    refundAmount?: number | null;
}
export declare class QueryBookingDto extends PaginationDto {
    status?: BookingStatus;
    channel?: BookingProvider;
    payment?: PaymentStatus;
    tourId?: string;
    assignmentId?: string;
}
export declare class BookingPatchDto {
    id: string;
    notes?: string | null;
    collectAmount?: number | null;
    refundAmount?: number | null;
}
export declare class BatchUpdateBookingsDto {
    items: BookingPatchDto[];
}

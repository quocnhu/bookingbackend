import { PaginationDto } from "../../common/dto/pagination.dto";
import { BookingProvider, BookingStatus, PaymentStatus, TourType } from '@prisma/client';
export declare class CreateBookingDto {
    bookingRef: string;
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
}
export declare class QueryBookingDto extends PaginationDto {
    q?: string;
    status?: BookingStatus;
    channel?: BookingProvider;
    payment?: PaymentStatus;
    tourId?: string;
    assignmentId?: string;
}

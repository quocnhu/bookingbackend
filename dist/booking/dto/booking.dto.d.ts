import { PaginationDto } from "../../common/dto/pagination.dto";
import { BookingProvider, BookingStatus, PaymentMethod, PaymentStatus, TourType } from '@prisma/client';
export declare class CreateBookingDto {
    bookingRef?: string;
    source?: string;
    confirmationCode?: string;
    channel?: BookingProvider;
    status?: BookingStatus;
    tourId: string;
    address: string;
    latitude?: number;
    longitude?: number;
    startingDate?: string | Date;
    departureTime?: string;
    customerName: string;
    hotelName: string;
    phone: string;
    mail?: string;
    totalPax: number;
    notes?: string;
    paxDetail?: string;
    tourType: TourType;
    tourName?: string;
    payment?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    payLater?: boolean;
    paymentDueAt?: string;
    paymentNote?: string;
    isNoShow?: boolean;
    noShowReason?: string;
}
export declare class WebsiteQuoteDto {
    tourId: string;
    tourType: TourType;
    totalPax: number;
}
export declare class CreateWebsiteBookingDto {
    tourId: string;
    tourType: TourType;
    startingDate: string | Date;
    departureTime?: string;
    customerName: string;
    hotelName: string;
    phone: string;
    mail: string;
    totalPax: number;
    paxDetail: string;
    address: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    payLater?: boolean;
    paymentNote?: string;
}
export declare class CollectBookingPaymentDto {
    method?: PaymentMethod;
    note?: string;
}
export declare class ConfirmBookingPaymentDto extends CollectBookingPaymentDto {
    reference?: string;
}
export declare class UpdateBookingDto {
    status?: BookingStatus;
    overrideCancelWindow?: boolean;
    tourId?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    startingDate?: string | Date;
    departureTime?: string;
    customerName?: string;
    hotelName?: string;
    phone?: string;
    mail?: string;
    totalPax?: number;
    tourType?: TourType;
    tourName?: string;
    payment?: PaymentStatus;
    isNoShow?: boolean;
    noShowReason?: string;
    notes?: string;
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
}
export declare class BatchUpdateBookingsDto {
    items: BookingPatchDto[];
}

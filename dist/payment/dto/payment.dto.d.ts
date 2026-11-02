import { BookingProvider, PaymentStatus } from '@prisma/client';
import { PaginationDto } from "../../common/dto/pagination.dto";
export declare class CreatePayPalOrderDto {
    bookingId: string;
}
export declare class CancelPayPalOrderDto {
    bookingId: string;
}
export declare class CapturePayPalOrderDto {
    bookingId: string;
    orderId: string;
    note?: string;
}
export declare class RecordOtaRemittanceDto {
    bookingId: string;
    netAmount: number;
    grossAmount?: number;
    commissionAmount?: number;
    paidAt?: string;
    reference?: string;
    note?: string;
}
export declare class QueryBookingPaymentsDto extends PaginationDto {
    payment?: PaymentStatus;
    channel?: BookingProvider;
    search?: string;
}

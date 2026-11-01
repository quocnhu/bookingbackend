export declare class CreatePayPalOrderDto {
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

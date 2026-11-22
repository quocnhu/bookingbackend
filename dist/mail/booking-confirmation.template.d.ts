export interface BookingConfirmationCompany {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
}
export interface BookingConfirmationData {
    bookingRef: string;
    customerName?: string | null;
    phone?: string | null;
    mail?: string | null;
    startingDate?: Date | string | null;
    departureTime?: string | null;
    totalPax: number;
    paxDetail?: string | null;
    totalAmount?: number | string | null;
    currency: string;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    payLater?: boolean;
    hotelName?: string | null;
    address?: string | null;
    notes?: string | null;
    tourName?: string | null;
    durationDays?: number | null;
}
export interface RenderedMail {
    subject: string;
    text: string;
    html: string;
}
export declare function renderBookingConfirmation(data: BookingConfirmationData, company?: BookingConfirmationCompany | null): RenderedMail;

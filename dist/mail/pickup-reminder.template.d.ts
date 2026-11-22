export interface PickupReminderContact {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
}
export interface PickupReminderCompany {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
}
export interface PickupReminderData {
    bookingRef: string;
    customerName?: string | null;
    tourName?: string | null;
    startingDate?: Date | string | null;
    pickupTime?: string | null;
    hotelName?: string | null;
    address?: string | null;
    totalPax?: number | null;
    paxDetail?: string | null;
    guide?: PickupReminderContact | null;
    driver?: PickupReminderContact | null;
    vehiclePlate?: string | null;
    durationDays?: number | null;
    company?: PickupReminderCompany | null;
}
export interface RenderedPickupReminder {
    subject: string;
    text: string;
    html: string;
}
export declare function renderPickupReminder(data: PickupReminderData): RenderedPickupReminder;

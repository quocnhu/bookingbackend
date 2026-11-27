export declare const MAIL_LOGIN_DETAIL_NOTE = "Please login the system to check in detail.";
export declare const MAIL_LOGIN_CONFIRM_NOTE = "Please login the system to confirm.";
export interface TransportAlertCompany {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
}
export interface TransportAlertData {
    title: string;
    message: string;
    note?: string | null;
    reference?: string | null;
    actionLabel?: string | null;
    actionUrl?: string | null;
    company?: TransportAlertCompany | null;
}
export interface RenderedTransportAlert {
    subject: string;
    text: string;
    html: string;
}
export declare function renderTransportAlert(data: TransportAlertData): RenderedTransportAlert;

export interface TransportAlertCompany {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
}
export interface TransportAlertData {
    title: string;
    message: string;
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

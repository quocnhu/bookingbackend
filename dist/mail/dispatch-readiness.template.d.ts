export interface DispatchReadinessRow {
    bus: string;
    tour: string;
    departure: string;
    pax: number;
    guide: string;
    driver: string;
    vehicle: string;
    provider: string;
    issues: string[];
}
export interface DispatchReadinessCompany {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
}
export interface DispatchReadinessData {
    dateKey: string;
    dateLabel: string;
    rows: DispatchReadinessRow[];
    actionLabel?: string | null;
    actionUrl?: string | null;
    company?: DispatchReadinessCompany | null;
}
export interface RenderedDispatchReadiness {
    subject: string;
    text: string;
    html: string;
}
export declare function renderDispatchReadiness(data: DispatchReadinessData): RenderedDispatchReadiness;
export declare function dispatchReadinessDeparture(date?: Date | string | null): string;

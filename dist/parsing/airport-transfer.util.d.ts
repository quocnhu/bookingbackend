export type MailContent = {
    body?: unknown;
    html?: unknown;
    snippet?: unknown;
};
export declare function airportTransferProduct(payload: MailContent): {
    product?: string;
    option?: string;
};
export declare function isAirportTransferMail(payload: MailContent): boolean;
export declare function refineTemplateTag(tag: string, mail: MailContent): string;

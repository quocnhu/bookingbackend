export type EmailAction = 'CREATE' | 'MODIFY' | 'CANCEL';
export declare function detectAction(subject: string, body?: string): EmailAction;
export declare function emailBodyText(payload: Record<string, unknown>): string;

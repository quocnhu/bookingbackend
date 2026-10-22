export type TemplateRuleField = 'subject' | 'from' | 'any';
export interface TemplateRule {
    field: TemplateRuleField;
    prefix: string;
    tag: string;
}
export interface MailHeaders {
    subject?: string | null;
    from?: string | null;
}
export declare function parseTemplateRules(raw?: string | null): TemplateRule[];
export declare function matchTemplateRule(rules: TemplateRule[], headers: MailHeaders): string | undefined;
export declare function defaultTemplateTag(fromRaw?: string | null, subjectRaw?: string | null): string;
export declare function isRoutedToTag(headers: MailHeaders, tag: string): boolean;
export declare function resolveTemplateTag(headers: MailHeaders, rules?: TemplateRule[]): string;

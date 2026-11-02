export type ResponseMailHeaders = {
    subject?: string | null;
    autoSubmitted?: string | null;
    inReplyTo?: string | null;
    xAutoreply?: string | null;
    xAutorespond?: string | null;
};
export declare function isResponseEmail(mail: ResponseMailHeaders): boolean;
export declare function isSentMailOnly(mail: {
    labelIds?: string[] | null;
}): boolean;

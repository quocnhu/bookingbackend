interface OidcPayload {
    iss: string;
    aud: string;
    exp: number;
    email?: string;
}
export declare class GoogleOidcService {
    verifyIdToken(token: string): Promise<OidcPayload>;
    private getAllowedAudiences;
}
export {};

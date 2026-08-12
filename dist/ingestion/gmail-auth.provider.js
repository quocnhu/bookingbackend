"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailAuthService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
let GmailAuthService = class GmailAuthService {
    getOAuthClient(options) {
        const client = new googleapis_1.google.auth.OAuth2({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUri: process.env.GOOGLE_REDIRECT_URI ||
                `${process.env.BASE_URL || 'http://localhost:4000'}/api/gmail/callback`,
        });
        if (options?.refreshToken) {
            client.setCredentials({ refresh_token: options.refreshToken });
        }
        return client;
    }
    buildConnectUrl(state) {
        const client = this.getOAuthClient();
        return client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: GMAIL_SCOPES,
            ...(process.env.GOOGLE_ALLOWED_EMAIL
                ? { login_hint: process.env.GOOGLE_ALLOWED_EMAIL }
                : {}),
            ...(state ? { state: JSON.stringify(state) } : {}),
        });
    }
    async exchangeCode(code) {
        const client = this.getOAuthClient();
        const { tokens } = await client.getToken(code);
        return {
            refreshToken: tokens.refresh_token ?? undefined,
            accessToken: tokens.access_token ?? undefined,
        };
    }
    getGmailClient(refreshToken) {
        return googleapis_1.google.gmail({
            version: 'v1',
            auth: this.getOAuthClient({ refreshToken }),
        });
    }
};
exports.GmailAuthService = GmailAuthService;
exports.GmailAuthService = GmailAuthService = __decorate([
    (0, common_1.Injectable)()
], GmailAuthService);
//# sourceMappingURL=gmail-auth.provider.js.map
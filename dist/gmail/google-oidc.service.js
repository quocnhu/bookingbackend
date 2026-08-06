"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleOidcService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
let GoogleOidcService = class GoogleOidcService {
    async verifyIdToken(token) {
        const allowedAuds = this.getAllowedAudiences();
        const verifyOptions = {
            audience: allowedAuds,
        };
        try {
            const oauth2 = googleapis_1.google.oauth2({ version: 'v2' });
            const tokeninfo = await oauth2.tokeninfo({ id_token: token });
            const payload = tokeninfo.data;
            if (!payload || payload.iss !== 'https://accounts.google.com') {
                throw new common_1.UnauthorizedException('Invalid OIDC issuer');
            }
            const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
            if (!aud.some((a) => allowedAuds.includes(a))) {
                throw new common_1.UnauthorizedException('Invalid OIDC audience');
            }
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                throw new common_1.UnauthorizedException('OIDC token expired');
            }
            return payload;
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException)
                throw err;
            throw new common_1.UnauthorizedException('Failed to verify OIDC token');
        }
    }
    getAllowedAudiences() {
        const auds = [
            process.env.GOOGLE_PUBSUB_TOPIC,
            process.env.GOOGLE_PUBSUB_SUBSCRIPTION,
            process.env.GOOGLE_CLIENT_ID,
        ].filter(Boolean);
        return auds;
    }
};
exports.GoogleOidcService = GoogleOidcService;
exports.GoogleOidcService = GoogleOidcService = __decorate([
    (0, common_1.Injectable)()
], GoogleOidcService);
//# sourceMappingURL=google-oidc.service.js.map
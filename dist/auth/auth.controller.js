"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_1 = require("@/common/decorators/public.decorator");
const current_user_decorator_1 = require("@/common/decorators/current-user.decorator");
const auth_service_1 = require("@/auth/auth.service");
const auth_dto_1 = require("@/auth/dto/auth.dto");
const cookies_1 = require("@/common/cookies");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    setAuthCookies(res, tokens) {
        res.cookie(cookies_1.ACCESS_TOKEN_COOKIE, tokens.accessToken, (0, cookies_1.cookieOptions)((0, cookies_1.parseDuration)(process.env.JWT_EXPIRES_IN, '1d')));
        res.cookie(cookies_1.REFRESH_TOKEN_COOKIE, tokens.refreshToken, (0, cookies_1.cookieOptions)((0, cookies_1.parseDuration)(process.env.REFRESH_EXPIRES_IN, '7d')));
    }
    clearAuthCookies(res) {
        res.clearCookie(cookies_1.ACCESS_TOKEN_COOKIE, { path: '/' });
        res.clearCookie(cookies_1.REFRESH_TOKEN_COOKIE, { path: '/' });
    }
    async register(dto, res) {
        const tokens = await this.authService.register(dto);
        this.setAuthCookies(res, tokens);
        return { success: true };
    }
    async login(dto, req, res) {
        const tokens = await this.authService.login(dto, req.ip, req.headers?.['user-agent']);
        this.setAuthCookies(res, tokens);
        return { success: true };
    }
    async refresh(dto, req, res) {
        const refreshToken = req.cookies?.[cookies_1.REFRESH_TOKEN_COOKIE] ?? dto.refreshToken;
        const tokens = await this.authService.refresh(refreshToken);
        this.setAuthCookies(res, tokens);
        return { success: true };
    }
    async logout(req, res) {
        await this.authService.logout(req.cookies?.[cookies_1.REFRESH_TOKEN_COOKIE], req.headers?.['user-agent']);
        this.clearAuthCookies(res);
        return { success: true };
    }
    googleLogin(redirect, res) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = `${process.env.BASE_URL || 'http://localhost:4000'}/api/auth/google/callback`;
        const state = Buffer.from(JSON.stringify({ redirect: redirect || '/' })).toString('base64url');
        const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope', 'openid email profile');
        url.searchParams.set('state', state);
        url.searchParams.set('prompt', 'select_account');
        return res.redirect(url.toString());
    }
    async googleCallback(code, state, req, res) {
        try {
            const tokens = await this.authService.exchangeGoogleCode(code);
            const profile = await this.authService.fetchGoogleProfile(tokens.access_token);
            const result = await this.authService.googleLogin({
                email: profile.email,
                name: profile.name,
                providerId: profile.sub || profile.email,
            }, req.ip, req.headers?.['user-agent']);
            this.setAuthCookies(res, result);
            let redirect = '/';
            if (state) {
                try {
                    redirect = JSON.parse(Buffer.from(state, 'base64url').toString()).redirect || '/';
                }
                catch {
                    redirect = '/';
                }
            }
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}${redirect}`);
        }
        catch {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/login?error=google`);
        }
    }
    getProfile(userId) {
        return this.authService.getProfile(userId);
    }
    updateProfile(userId, dto) {
        return this.authService.updateProfile(userId, dto);
    }
    changePassword(userId, dto) {
        return this.authService.changePassword(userId, dto);
    }
    userInfo(req) {
        return req.user;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RefreshTokenDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('google'),
    __param(0, (0, common_1.Query)('redirect')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleLogin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('google/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)('profile'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, auth_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)('change-password'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, auth_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Get)('userinfo'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "userInfo", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
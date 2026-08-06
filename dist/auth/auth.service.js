"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const googleapis_1 = require("googleapis");
const prisma_service_1 = require("../prisma/prisma.service");
const permissions_service_1 = require("./permissions.service");
const auth_activities_service_1 = require("../auth-activities/auth-activities.service");
const drive_service_1 = require("../drive/drive.service");
const client_1 = require("@prisma/client");
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000;
const MAX_IP_FAILURES = 20;
const IP_BLOCK_MS = 60 * 60 * 1000;
let AuthService = class AuthService {
    prisma;
    jwtService;
    permissionsService;
    authActivitiesService;
    driveService;
    ipFailures = new Map();
    constructor(prisma, jwtService, permissionsService, authActivitiesService, driveService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.permissionsService = permissionsService;
        this.authActivitiesService = authActivitiesService;
        this.driveService = driveService;
    }
    async issueTokens(user) {
        const accessToken = await this.jwtService.signAsync(user, {
            secret: process.env.JWT_SECRET,
            expiresIn: (process.env.JWT_EXPIRES_IN || '1d'),
        });
        const refreshToken = await this.jwtService.signAsync({ sub: user.id, type: 'refresh' }, {
            secret: process.env.REFRESH_SECRET,
            expiresIn: (process.env.REFRESH_EXPIRES_IN || '7d'),
        });
        return { accessToken, refreshToken };
    }
    isIpBlocked(ip) {
        const entry = this.ipFailures.get(ip);
        if (!entry)
            return false;
        if (Date.now() > entry.until) {
            this.ipFailures.delete(ip);
            return false;
        }
        return entry.count >= MAX_IP_FAILURES;
    }
    recordIpFailure(ip) {
        const entry = this.ipFailures.get(ip) ?? { count: 0, until: 0 };
        entry.count += 1;
        entry.until = Date.now() + IP_BLOCK_MS;
        this.ipFailures.set(ip, entry);
    }
    clearIpFailures(ip) {
        this.ipFailures.delete(ip);
    }
    async recordFailedLogin(userId, ip, userAgent) {
        this.recordIpFailure(ip);
        if (userId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                return;
            const attempts = user.failedLoginAttempts + 1;
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    failedLoginAttempts: attempts,
                    lockoutUntil: attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : user.lockoutUntil,
                },
            });
        }
        await this.authActivitiesService.record({
            userId,
            eventType: 'LOGIN_FAILED',
            ipAddress: ip,
            userAgent,
        });
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new common_1.BadRequestException('Email already registered');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
                passwordHash,
                authProvider: client_1.AuthProvider.LOCAL,
            },
        });
        const authUser = await this.permissionsService.toAuthenticatedUser(user.id);
        await this.driveService.ensureUserDrive(user.id);
        return this.issueTokens(authUser);
    }
    async login(dto, ip, userAgent) {
        if (this.isIpBlocked(ip)) {
            throw new common_1.UnauthorizedException('Too many failed attempts from this IP. Try again later.');
        }
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (user && user.lockoutUntil && user.lockoutUntil > new Date()) {
            throw new common_1.UnauthorizedException(`Account is locked due to too many failed attempts. Try again after 1 hour.`);
        }
        if (!user || !user.passwordHash || !user.isActive) {
            await this.recordFailedLogin(user?.id ?? null, ip, userAgent);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) {
            await this.recordFailedLogin(user.id, ip, userAgent);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date(), failedLoginAttempts: 0, lockoutUntil: null },
        });
        await this.prisma.userSession.create({
            data: {
                userId: user.id,
                token: (0, crypto_1.randomUUID)(),
                loggedInAt: new Date(),
                ipAddress: ip,
            },
        });
        this.clearIpFailures(ip);
        await this.authActivitiesService.record({
            userId: user.id,
            eventType: 'LOGIN',
            authProvider: user.authProvider,
            ipAddress: ip,
            userAgent,
        });
        const authUser = await this.permissionsService.toAuthenticatedUser(user.id);
        await this.driveService.ensureUserDrive(user.id);
        return this.issueTokens(authUser);
    }
    async googleLogin(profile, ip, userAgent) {
        let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: profile.email,
                    name: profile.name,
                    authProvider: client_1.AuthProvider.GOOGLE,
                    providerId: profile.providerId,
                    role: client_1.RoleType.CUSTOMER,
                    userType: 'customer',
                },
            });
        }
        else {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            });
        }
        await this.prisma.userSession.create({
            data: {
                userId: user.id,
                token: (0, crypto_1.randomUUID)(),
                loggedInAt: new Date(),
                ipAddress: ip,
            },
        });
        await this.authActivitiesService.record({
            userId: user.id,
            eventType: 'LOGIN',
            authProvider: client_1.AuthProvider.GOOGLE,
            ipAddress: ip,
            userAgent,
        });
        const authUser = await this.permissionsService.toAuthenticatedUser(user.id);
        await this.driveService.ensureUserDrive(user.id);
        return this.issueTokens(authUser);
    }
    async logout(refreshToken, userAgent) {
        let userId = null;
        if (refreshToken) {
            try {
                const payload = await this.jwtService.verifyAsync(refreshToken, {
                    secret: process.env.REFRESH_SECRET,
                });
                if (payload.type === 'refresh') {
                    userId = payload.sub;
                }
                if (userId) {
                    await this.prisma.userSession.updateMany({
                        where: { userId, loggedOutAt: null },
                        data: { loggedOutAt: new Date() },
                    });
                }
            }
            catch {
            }
        }
        if (userId) {
            await this.authActivitiesService.record({
                userId,
                eventType: 'LOGOUT',
                userAgent,
            });
        }
        return { success: true };
    }
    getOAuthClient() {
        return new googleapis_1.google.auth.OAuth2({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUri: `${process.env.BASE_URL || 'http://localhost:4000'}/api/auth/google/callback`,
        });
    }
    async exchangeGoogleCode(code) {
        const client = this.getOAuthClient();
        const { tokens } = await client.getToken(code);
        return {
            access_token: tokens.access_token ?? undefined,
            refresh_token: tokens.refresh_token ?? undefined,
        };
    }
    async fetchGoogleProfile(accessToken) {
        const client = this.getOAuthClient();
        client.setCredentials({ access_token: accessToken });
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: client });
        const { data } = await oauth2.userinfo.get();
        return { email: data.email, name: data.name, sub: data.id };
    }
    async refresh(refreshToken) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.REFRESH_SECRET,
            });
            if (payload.type !== 'refresh') {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            if (user.lockoutUntil && user.lockoutUntil > new Date()) {
                throw new common_1.UnauthorizedException('Account is locked. Try again after 1 hour.');
            }
            const authUser = await this.permissionsService.toAuthenticatedUser(user.id);
            return this.issueTokens(authUser);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            include: {
                roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
                permissions: { include: { permission: true } },
            },
        });
        const authUser = await this.permissionsService.toAuthenticatedUser(userId);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            role: user.role,
            userType: user.userType,
            authProvider: user.authProvider,
            createdAt: user.createdAt,
            permissions: authUser.permissions,
            roles: user.roles.map((r) => r.role),
        };
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.passwordHash) {
            throw new common_1.BadRequestException('Account has no local password');
        }
        const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!valid) {
            throw new common_1.BadRequestException('Current password is incorrect');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
        });
        return { message: 'Password updated' };
    }
    async updateProfile(userId, dto) {
        await this.prisma.user.update({ where: { id: userId }, data: dto });
        return this.getProfile(userId);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        permissions_service_1.PermissionsService,
        auth_activities_service_1.AuthActivitiesService,
        drive_service_1.DriveService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
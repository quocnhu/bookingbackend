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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailConnectService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const gmail_auth_provider_1 = require("./gmail-auth.provider");
const gmail_watch_service_1 = require("./gmail-watch.service");
let GmailConnectService = class GmailConnectService {
    prisma;
    auth;
    watch;
    constructor(prisma, auth, watch) {
        this.prisma = prisma;
        this.auth = auth;
        this.watch = watch;
    }
    buildConnectUrl(accountId) {
        return this.auth.buildConnectUrl(accountId ? { connect: 'gmail', accountId } : { connect: 'gmail' });
    }
    async handleCallback(code, state) {
        if (!code)
            throw new common_1.BadRequestException('Missing authorization code');
        let accountId;
        if (state) {
            try {
                const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
                accountId = parsed?.accountId;
            }
            catch {
            }
        }
        const tokens = await this.auth.exchangeCode(code);
        const refreshToken = tokens.refreshToken;
        if (!refreshToken) {
            throw new common_1.BadRequestException('No refresh token returned (grant offline access)');
        }
        const gmail = this.auth.getGmailClient(tokens.accessToken);
        const profile = await gmail.users.getProfile({ userId: 'me' });
        const email = profile.data.emailAddress;
        const historyId = profile.data.historyId;
        if (!email)
            throw new common_1.BadRequestException('Could not resolve mailbox email');
        const allowed = process.env.GOOGLE_ALLOWED_EMAIL?.toLowerCase();
        if (allowed && email.toLowerCase() !== allowed) {
            throw new common_1.BadRequestException(`Mailbox ${email} is not allowed — only ${allowed} can be tracked`);
        }
        let watchExpiration = null;
        try {
            watchExpiration = await this.watch.registerWatch(refreshToken);
        }
        catch (err) {
            console.warn(`[gmail] watch failed for ${email}:`, err?.message);
        }
        if (accountId) {
            const existing = await this.prisma.gmailAccount.findUnique({
                where: { id: accountId },
            });
            if (!existing)
                throw new common_1.NotFoundException('Tracked mailbox not found');
            const account = await this.prisma.gmailAccount.update({
                where: { id: accountId },
                data: {
                    refreshToken,
                    email,
                    lastHistoryId: historyId ? String(historyId) : existing.lastHistoryId,
                    ...(watchExpiration ? { watchExpiration } : {}),
                },
            });
            return {
                reconnected: true,
                email: account.email,
                watchExpiration: account.watchExpiration,
            };
        }
        const account = await this.prisma.gmailAccount.upsert({
            where: { email },
            update: {
                refreshToken,
                lastHistoryId: historyId ? String(historyId) : undefined,
                ...(watchExpiration ? { watchExpiration } : {}),
            },
            create: {
                email,
                refreshToken,
                lastHistoryId: historyId ? String(historyId) : '0',
                watchExpiration: watchExpiration ?? new Date(),
            },
        });
        return {
            connected: true,
            email: account.email,
            watchExpiration: account.watchExpiration,
        };
    }
    async list() {
        const accounts = await this.prisma.gmailAccount.findMany({
            orderBy: { createdAt: 'desc' },
        });
        const now = Date.now();
        return accounts.map((a) => ({
            id: a.id,
            email: a.email,
            lastHistoryId: a.lastHistoryId,
            watchExpiration: a.watchExpiration,
            isWatchActive: a.watchExpiration.getTime() > now,
            expiresInDays: Math.max(0, Math.round((a.watchExpiration.getTime() - now) / 86400000)),
            refreshTokenMasked: this.maskToken(a.refreshToken),
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
        }));
    }
    maskToken(token) {
        if (!token)
            return '';
        if (token.length <= 8)
            return '*'.repeat(token.length);
        return `${token.slice(0, 4)}...${token.slice(-4)}`;
    }
    async remove(id) {
        const existing = await this.prisma.gmailAccount.findUnique({
            where: { id },
        });
        if (!existing)
            throw new common_1.NotFoundException('Tracked mailbox not found');
        await this.prisma.gmailAccount.delete({ where: { id } });
        return { success: true };
    }
};
exports.GmailConnectService = GmailConnectService;
exports.GmailConnectService = GmailConnectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gmail_auth_provider_1.GmailAuthService,
        gmail_watch_service_1.GmailWatchService])
], GmailConnectService);
//# sourceMappingURL=gmail-connect.service.js.map
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
var GmailWatchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailWatchService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("@/prisma/prisma.service");
const gmail_auth_provider_1 = require("./gmail-auth.provider");
const RENEW_WINDOW_MS = 24 * 60 * 60 * 1000;
let GmailWatchService = GmailWatchService_1 = class GmailWatchService {
    prisma;
    auth;
    logger = new common_1.Logger(GmailWatchService_1.name);
    constructor(prisma, auth) {
        this.prisma = prisma;
        this.auth = auth;
    }
    async registerWatch(refreshToken) {
        const topic = process.env.GOOGLE_PUBSUB_TOPIC;
        if (!topic) {
            this.logger.warn('GOOGLE_PUBSUB_TOPIC not set — skipping watch()');
            return null;
        }
        const gmail = this.auth.getGmailClient(refreshToken);
        const watch = await gmail.users.watch({
            userId: 'me',
            requestBody: { topicName: topic, labelIds: ['INBOX'] },
        });
        return watch.data.expiration
            ? new Date(Number(watch.data.expiration))
            : null;
    }
    async registerWatchForAccount(accountId) {
        const account = await this.prisma.gmailAccount.findUnique({
            where: { id: accountId },
        });
        if (!account)
            return { watchExpiration: null };
        const expiration = await this.registerWatch(account.refreshToken);
        if (expiration) {
            await this.prisma.gmailAccount.update({
                where: { id: accountId },
                data: { watchExpiration: expiration },
            });
        }
        return { watchExpiration: expiration };
    }
    async renewExpiringWatches() {
        const accounts = await this.prisma.gmailAccount.findMany();
        const soon = new Date(Date.now() + RENEW_WINDOW_MS);
        const expiring = accounts.filter((a) => a.watchExpiration < soon);
        let renewed = 0;
        for (const account of expiring) {
            try {
                const expiration = await this.registerWatch(account.refreshToken);
                if (expiration) {
                    await this.prisma.gmailAccount.update({
                        where: { id: account.id },
                        data: { watchExpiration: expiration },
                    });
                    renewed++;
                }
            }
            catch (err) {
                this.logger.warn(`Renew watch failed for ${account.email}: ${err.message}`);
            }
        }
        if (renewed > 0 || expiring.length > 0) {
            this.logger.log(`Watch renewal: ${renewed}/${expiring.length} expiring accounts renewed`);
        }
        return { checked: accounts.length, expiringSoon: expiring.length, renewed };
    }
};
exports.GmailWatchService = GmailWatchService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GmailWatchService.prototype, "renewExpiringWatches", null);
exports.GmailWatchService = GmailWatchService = GmailWatchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gmail_auth_provider_1.GmailAuthService])
], GmailWatchService);
//# sourceMappingURL=gmail-watch.service.js.map
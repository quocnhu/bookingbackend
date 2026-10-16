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
var GmailPollService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailPollService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const gmail_pubsub_service_1 = require("./gmail-pubsub.service");
let GmailPollService = GmailPollService_1 = class GmailPollService {
    config;
    prisma;
    gmailPubSub;
    logger = new common_1.Logger(GmailPollService_1.name);
    timer;
    running = false;
    constructor(config, prisma, gmailPubSub) {
        this.config = config;
        this.prisma = prisma;
        this.gmailPubSub = gmailPubSub;
    }
    onModuleInit() {
        if (!this.isEnabled()) {
            this.logger.log('Gmail polling disabled (GMAIL_POLL_ENABLED != true)');
            return;
        }
        const interval = this.intervalMs();
        this.timer = setInterval(() => {
            void this.poll();
        }, interval);
        this.logger.log(`Gmail polling started — every ${interval}ms`);
    }
    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
            this.logger.log('Gmail polling stopped');
        }
    }
    async poll() {
        if (this.running)
            return;
        this.running = true;
        try {
            const accounts = await this.prisma.gmailAccount.findMany();
            for (const account of accounts) {
                try {
                    const result = await this.gmailPubSub.handlePush({
                        emailAddress: account.email,
                        historyId: Number(account.lastHistoryId),
                    });
                    this.logger.log(`Polled ${account.email}: ${JSON.stringify(result)}`);
                }
                catch (err) {
                    this.logger.error(`Poll failed for ${account.email}: ${err.message}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`Gmail poll error: ${err.message}`);
        }
        finally {
            this.running = false;
        }
    }
    isEnabled() {
        const raw = this.config.get('GMAIL_POLL_ENABLED');
        return (raw ?? 'false').toLowerCase() === 'true';
    }
    intervalMs() {
        const n = Number(this.config.get('GMAIL_POLL_INTERVAL_MS'));
        return Number.isFinite(n) && n >= 5000 ? n : 60_000;
    }
};
exports.GmailPollService = GmailPollService;
exports.GmailPollService = GmailPollService = GmailPollService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        gmail_pubsub_service_1.GmailPubSubService])
], GmailPollService);
//# sourceMappingURL=gmail-poll.service.js.map
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
exports.GmailService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../prisma/prisma.service");
const queue_constants_1 = require("../queues/queue.constants");
const google_oidc_service_1 = require("./google-oidc.service");
let GmailService = class GmailService {
    prisma;
    googleOidcService;
    rawDataQueue;
    constructor(prisma, googleOidcService, rawDataQueue) {
        this.prisma = prisma;
        this.googleOidcService = googleOidcService;
        this.rawDataQueue = rawDataQueue;
    }
    async handleWebhook(authorizationHeader, body) {
        if (!authorizationHeader) {
            throw new common_1.BadRequestException('Missing Authorization header');
        }
        const [type, token] = authorizationHeader.split(' ');
        if (type !== 'Bearer' || !token) {
            throw new common_1.BadRequestException('Invalid Authorization header');
        }
        const payload = await this.googleOidcService.verifyIdToken(token);
        const message = body?.message;
        if (!message?.data) {
            throw new common_1.BadRequestException('Missing message.data');
        }
        const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
        const { emailAddress, historyId } = decoded;
        if (!emailAddress || !historyId) {
            throw new common_1.BadRequestException('Missing emailAddress or historyId');
        }
        await this.rawDataQueue.add('gmail-history', {
            sourceId: `gmail-history-${historyId}`,
            payload: { emailAddress, historyId, oidcEmail: payload.email },
        }, {
            jobId: `gmail-history-${historyId}`,
            removeOnComplete: 1000,
            removeOnFail: 5000,
        });
        return { received: true, queued: true, historyId, emailAddress };
    }
    async renewWatchIfNeeded() {
        const accounts = await this.prisma.gmailAccount.findMany();
        const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const expiring = accounts.filter((a) => a.watchExpiration < soon);
        return { accounts: accounts.length, expiringSoon: expiring.length };
    }
};
exports.GmailService = GmailService;
exports.GmailService = GmailService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)(queue_constants_1.RAW_DATA_QUEUE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        google_oidc_service_1.GoogleOidcService,
        bullmq_2.Queue])
], GmailService);
//# sourceMappingURL=gmail.service.js.map
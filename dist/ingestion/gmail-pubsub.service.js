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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var GmailPubSubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailPubSubService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const prisma_service_1 = require("@/prisma/prisma.service");
const raw_data_service_1 = require("@/raw-data/raw-data.service");
const parsing_queue_1 = require("@/parsing/parsing.queue");
const redis_constants_1 = require("@/common/redis/redis.constants");
const gmail_auth_provider_1 = require("./gmail-auth.provider");
let GmailPubSubService = GmailPubSubService_1 = class GmailPubSubService {
    prisma;
    auth;
    rawDataService;
    parsingQueue;
    redis;
    logger = new common_1.Logger(GmailPubSubService_1.name);
    constructor(prisma, auth, rawDataService, parsingQueue, redis) {
        this.prisma = prisma;
        this.auth = auth;
        this.rawDataService = rawDataService;
        this.parsingQueue = parsingQueue;
        this.redis = redis;
    }
    async handlePush(payload) {
        const { emailAddress, historyId } = payload;
        const account = await this.prisma.gmailAccount.findUnique({
            where: { email: emailAddress },
        });
        if (!account) {
            this.logger.warn(`Push from untracked mailbox ${emailAddress} — ignored`);
            return { handled: 0, duplicates: 0, ignored: true };
        }
        const startHistoryId = (await this.redis.get((0, redis_constants_1.historyCheckpointKey)(emailAddress))) ??
            account.lastHistoryId;
        this.logger.log(`History sync ${emailAddress}: startHistoryId=${startHistoryId} pushHistoryId=${historyId}`);
        const gmail = this.auth.getGmailClient(account.refreshToken);
        const history = await gmail.users.history.list({
            userId: 'me',
            startHistoryId,
            historyTypes: ['messageAdded'],
        });
        const messageIds = (history.data.history ?? [])
            .flatMap((h) => h.messages?.map((m) => m.id).filter(Boolean) ?? [])
            .filter((id) => Boolean(id))
            .filter((id, index, arr) => arr.indexOf(id) === index);
        let handled = 0;
        let duplicates = 0;
        for (const messageId of messageIds) {
            const claimed = await this.redis.set((0, redis_constants_1.dedupKey)(messageId), '1', 'EX', redis_constants_1.DEDUP_TTL_SECONDS, 'NX');
            if (!claimed) {
                duplicates++;
                continue;
            }
            try {
                const mail = await this.fetchMessage(gmail, messageId, emailAddress);
                console.log('[ingestion] parsed mail:', {
                    messageId: mail.messageId,
                    emailAddress: mail.emailAddress,
                    from: mail.from,
                    subject: mail.subject,
                    date: mail.date ?? mail.internalDate,
                    snippet: mail.snippet?.slice(0, 300),
                    bodyPreview: mail.body?.slice(0, 500),
                });
                const templateTag = this.tagTemplate(mail);
                console.log('[ingestion] template tag:', {
                    emailAddress,
                    messageId,
                    templateTag,
                });
                const rawData = await this.rawDataService.createIngested({
                    sourceId: `gmail-${messageId}`,
                    email: emailAddress,
                    templateTag,
                    payload: {
                        ...mail,
                        emailAddress,
                        historyId,
                    },
                });
                await this.parsingQueue.enqueue(rawData.id);
                handled++;
            }
            catch (err) {
                this.logger.error(`Failed to ingest ${messageId}: ${err.message}`);
            }
        }
        const nextHistoryId = history.data.historyId;
        if (nextHistoryId) {
            await this.redis.set((0, redis_constants_1.historyCheckpointKey)(emailAddress), String(nextHistoryId));
            await this.prisma.gmailAccount.update({
                where: { id: account.id },
                data: { lastHistoryId: String(nextHistoryId) },
            });
        }
        return { handled, duplicates, nextHistoryId: nextHistoryId ?? null };
    }
    async testConnection(accountId) {
        const account = await this.prisma.gmailAccount.findUnique({
            where: { id: accountId },
        });
        if (!account)
            throw new Error('Tracked mailbox not found');
        const gmail = this.auth.getGmailClient(account.refreshToken);
        const profile = await gmail.users.getProfile({ userId: 'me' });
        return {
            ok: true,
            email: profile.data.emailAddress ?? account.email,
            historyId: profile.data.historyId,
        };
    }
    async fetchMessage(gmail, messageId, emailAddress) {
        const msg = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
        });
        const headers = msg.data.payload?.headers ?? [];
        const header = (name) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
            ?.value ?? '';
        return {
            messageId,
            threadId: msg.data.threadId ?? undefined,
            emailAddress,
            subject: header('subject'),
            from: header('from'),
            date: header('date') || undefined,
            snippet: msg.data.snippet ?? undefined,
            body: this.extractTextBody(msg.data.payload),
            html: this.extractHtmlBody(msg.data.payload) || undefined,
            internalDate: msg.data.internalDate ?? undefined,
        };
    }
    extractTextBody(payload) {
        if (!payload)
            return '';
        if (payload.mimeType === 'text/plain' && payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
        }
        let text = '';
        for (const part of payload.parts ?? []) {
            text += this.extractTextBody(part) + '\n';
        }
        return text.trim();
    }
    extractHtmlBody(payload) {
        if (!payload)
            return '';
        if (payload.mimeType === 'text/html' && payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
        }
        let html = '';
        for (const part of payload.parts ?? []) {
            html += this.extractHtmlBody(part) + '\n';
        }
        return html.trim();
    }
    tagTemplate(mail) {
        const from = mail.from.toLowerCase();
        const subject = mail.subject.toLowerCase();
        let tag = 'unknown';
        if (from.includes('airbnb.com'))
            tag = 'airbnb';
        else if (from.includes('booking.com') || from.includes('@booking.com'))
            tag = 'booking-com';
        else if (from.includes('tripadvisor.com'))
            tag = 'tripadvisor';
        else if (subject.includes('tripadvisor'))
            tag = 'tripadvisor';
        else if (/booking|reservation|confirmation|trip to/i.test(subject))
            tag = 'website';
        return tag;
    }
};
exports.GmailPubSubService = GmailPubSubService;
exports.GmailPubSubService = GmailPubSubService = GmailPubSubService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(redis_constants_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gmail_auth_provider_1.GmailAuthService,
        raw_data_service_1.RawDataService,
        parsing_queue_1.ParsingQueue,
        ioredis_1.default])
], GmailPubSubService);
//# sourceMappingURL=gmail-pubsub.service.js.map
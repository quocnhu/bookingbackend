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
var GmailSubscriberService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailSubscriberService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pubsub_1 = require("@google-cloud/pubsub");
const gmail_pubsub_service_1 = require("./gmail-pubsub.service");
let GmailSubscriberService = GmailSubscriberService_1 = class GmailSubscriberService {
    config;
    gmailPubSub;
    logger = new common_1.Logger(GmailSubscriberService_1.name);
    subscription;
    constructor(config, gmailPubSub) {
        this.config = config;
        this.gmailPubSub = gmailPubSub;
    }
    onModuleInit() {
        const enabled = this.isEnabled();
        if (!enabled) {
            this.logger.log('Streaming pull disabled (GOOGLE_PUBSUB_PULL_ENABLED != true) — using push webhook');
            return;
        }
        const subName = this.config.get('GOOGLE_PUBSUB_SUBSCRIPTION');
        if (!subName) {
            this.logger.warn('GOOGLE_PUBSUB_PULL_ENABLED=true but GOOGLE_PUBSUB_SUBSCRIPTION is not set — skipping');
            return;
        }
        try {
            const projectId = this.config.get('GOOGLE_CLOUD_PROJECT') ??
                this.parseProjectId(subName);
            const keyFilename = this.config.get('GOOGLE_APPLICATION_CREDENTIALS');
            const pubsub = new pubsub_1.PubSub({
                ...(projectId ? { projectId } : {}),
                ...(keyFilename ? { keyFilename } : {}),
            });
            this.subscription = pubsub.subscription(subName, {
                flowControl: { maxMessages: 10 },
            });
            this.subscription.on('message', (message) => {
                void this.handleMessage(message);
            });
            this.subscription.on('error', (err) => {
                this.logger.error(`Pub/Sub subscription error: ${err.message}`);
            });
            this.logger.log(`Streaming pull started on ${subName}`);
        }
        catch (err) {
            this.logger.error(`Failed to start streaming pull: ${err.message}`);
        }
    }
    async handleMessage(message) {
        try {
            const decoded = JSON.parse(message.data.toString('utf-8'));
            const payload = {
                emailAddress: decoded.emailAddress,
                historyId: Number(decoded.historyId),
            };
            if (!payload.emailAddress || !payload.historyId) {
                this.logger.warn('Invalid Pub/Sub payload (missing emailAddress/historyId) — acking');
                message.ack();
                return;
            }
            const result = await this.gmailPubSub.handlePush(payload);
            this.logger.log(`Pulled notification for ${payload.emailAddress}: ${JSON.stringify(result)}`);
            message.ack();
        }
        catch (err) {
            this.logger.error(`Failed to handle pulled message: ${err.message}`);
            message.nack();
        }
    }
    async onModuleDestroy() {
        if (!this.subscription)
            return;
        try {
            await this.subscription.close();
            this.logger.log('Streaming pull stopped');
        }
        catch (err) {
            this.logger.warn(`Failed to close subscription: ${err.message}`);
        }
    }
    isEnabled() {
        const raw = this.config.get('GOOGLE_PUBSUB_PULL_ENABLED');
        return (raw ?? 'false').toLowerCase() === 'true';
    }
    parseProjectId(subName) {
        const match = subName.match(/projects\/([^/]+)/);
        return match?.[1];
    }
};
exports.GmailSubscriberService = GmailSubscriberService;
exports.GmailSubscriberService = GmailSubscriberService = GmailSubscriberService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        gmail_pubsub_service_1.GmailPubSubService])
], GmailSubscriberService);
//# sourceMappingURL=gmail-subscriber.service.js.map
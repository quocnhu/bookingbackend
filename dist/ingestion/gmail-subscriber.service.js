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
let GmailSubscriberService = class GmailSubscriberService {
    static { GmailSubscriberService_1 = this; }
    config;
    gmailPubSub;
    logger = new common_1.Logger(GmailSubscriberService_1.name);
    pubsub;
    subscription;
    reconnectTimer;
    attempts = 0;
    connecting = false;
    destroyed = false;
    failureLogged = false;
    lastWarningAt = 0;
    static WARNING_INTERVAL_MS = 5 * 60_000;
    constructor(config, gmailPubSub) {
        this.config = config;
        this.gmailPubSub = gmailPubSub;
    }
    onModuleInit() {
        if (!this.isEnabled()) {
            this.logger.log('Streaming pull disabled (GOOGLE_PUBSUB_PULL_ENABLED != true)');
            return;
        }
        const subName = this.config.get('GOOGLE_PUBSUB_SUBSCRIPTION');
        if (!subName) {
            this.logger.warn('GOOGLE_PUBSUB_PULL_ENABLED=true but GOOGLE_PUBSUB_SUBSCRIPTION is not set — skipping');
            return;
        }
        const projectId = this.config.get('GOOGLE_CLOUD_PROJECT') ??
            this.parseProjectId(subName);
        const keyFilename = this.config.get('GOOGLE_APPLICATION_CREDENTIALS');
        try {
            this.pubsub = new pubsub_1.PubSub({
                ...(projectId ? { projectId } : {}),
                ...(keyFilename ? { keyFilename } : {}),
            });
        }
        catch (err) {
            this.logger.error(`Streaming pull: invalid Pub/Sub credentials (${err.message})`);
            return;
        }
        void this.connect();
    }
    async connect() {
        if (this.connecting || this.destroyed || !this.pubsub)
            return;
        this.connecting = true;
        this.attempts++;
        const subName = this.config.get('GOOGLE_PUBSUB_SUBSCRIPTION');
        try {
            const ready = await this.ensureSubscription(subName);
            if (!ready) {
                this.scheduleReconnect();
                return;
            }
            this.openStream(subName);
        }
        catch (err) {
            this.reportFailure(err, subName);
            this.scheduleReconnect();
        }
        finally {
            this.connecting = false;
        }
    }
    async ensureSubscription(subName) {
        const pubsub = this.pubsub;
        const sub = pubsub.subscription(subName);
        try {
            const [exists] = await sub.exists();
            if (exists) {
                this.failureLogged = false;
                return true;
            }
        }
        catch (err) {
            const code = err.code;
            if (code !== 7)
                throw err;
            this.logger.warn(`Streaming pull: cannot check whether "${this.shortName(subName)}" exists (PERMISSION_DENIED) — trying to open the stream`);
            return true;
        }
        if (!this.autoCreate())
            return false;
        const topicName = this.config.get('GOOGLE_PUBSUB_TOPIC') ??
            `projects/${this.projectId(subName)}/topics/gmail-notifications`;
        try {
            const [created] = await this.pubsub.topic(topicName).createSubscription(this.shortName(subName), { ackDeadlineSeconds: 60 });
            this.logger.log(`Streaming pull: created subscription ${created.name}`);
            this.failureLogged = false;
            return true;
        }
        catch (err) {
            const code = err.code;
            if (code === 6) {
                return true;
            }
            throw err;
        }
    }
    openStream(subName) {
        if (this.destroyed || this.subscription)
            return;
        try {
            this.subscription = this.pubsub.subscription(subName, {
                flowControl: { maxMessages: 10 },
            });
            this.subscription.on('message', (message) => {
                void this.handleMessage(message);
            });
            this.subscription.on('error', (err) => {
                const code = err.code;
                this.logger.error(`Pub/Sub subscription error: ${err.message}`);
                if (code === 5 || code === 7 || code === 16) {
                    void this.closeStream();
                    this.scheduleReconnect();
                }
            });
            this.attempts = 0;
            this.failureLogged = false;
            this.logger.log(`Streaming pull started on ${this.shortName(subName)} (project ${this.projectId(subName)})`);
        }
        catch (err) {
            this.reportFailure(err, subName);
            this.scheduleReconnect();
        }
    }
    async closeStream() {
        const sub = this.subscription;
        this.subscription = undefined;
        if (!sub)
            return;
        try {
            await sub.close();
        }
        catch {
        }
    }
    scheduleReconnect() {
        if (this.destroyed || this.reconnectTimer)
            return;
        const delay = this.reconnectMs();
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            void this.connect();
        }, delay);
        this.reconnectTimer.unref?.();
    }
    reportFailure(err, subName) {
        const code = err.code;
        const name = this.shortName(subName);
        const project = this.projectId(subName);
        if (this.failureLogged) {
            const now = Date.now();
            if (now - this.lastWarningAt <
                GmailSubscriberService_1.WARNING_INTERVAL_MS) {
                return;
            }
            this.lastWarningAt = now;
            this.logger.warn(`Streaming pull still not connected (attempt ${this.attempts}): ${err.message}`);
            return;
        }
        this.failureLogged = true;
        this.lastWarningAt = Date.now();
        if (code === 5) {
            this.logger.error(`Streaming pull: subscription "${name}" does not exist in project "${project}". ` +
                `Create it (GCP Console → Pub/Sub → Subscriptions, Pull, ack deadline 60s) or set ` +
                `GOOGLE_PUBSUB_AUTO_CREATE_SUBSCRIPTION=true and grant the service account ` +
                `roles/pubsub.editor. It will connect automatically within ${Math.round(this.reconnectMs() / 1000)}s after it exists — no restart needed.`);
            return;
        }
        if (code === 7) {
            this.logger.error(`Streaming pull: PERMISSION_DENIED on "${name}" (project "${project}"). ` +
                `The service account needs pubsub.subscriptions.consume on the subscription ` +
                `(roles/pubsub.subscriber) and pubsub.subscriptions.create on the project ` +
                `(roles/pubsub.editor / roles/pubsub.admin) to auto-create it. Retrying in ` +
                `${Math.round(this.reconnectMs() / 1000)}s.`);
            return;
        }
        if (code === 16) {
            this.logger.error(`Streaming pull: UNAUTHENTICATED on "${name}" (project "${project}"). ` +
                `The key in GOOGLE_APPLICATION_CREDENTIALS is invalid, revoked, or belongs ` +
                `to a deleted service account. Download a fresh JSON key for the service ` +
                `account that was granted roles/pubsub.subscriber, replace the file and ` +
                `restart. Retrying in ${Math.round(this.reconnectMs() / 1000)}s.`);
            return;
        }
        this.logger.error(`Streaming pull failed: ${err.message}`);
    }
    async handleMessage(message) {
        try {
            const decoded = JSON.parse(message.data.toString('utf-8'));
            const emailAddress = decoded.emailAddress;
            const historyId = Number(decoded.historyId);
            if (!emailAddress || !historyId) {
                this.logger.warn('Invalid Pub/Sub payload (missing emailAddress/historyId) — acking');
                message.ack();
                return;
            }
            const payload = { emailAddress, historyId };
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
        this.destroyed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        await this.closeStream();
        this.logger.log('Streaming pull stopped');
    }
    isEnabled() {
        const raw = this.config.get('GOOGLE_PUBSUB_PULL_ENABLED');
        return (raw ?? 'false').toLowerCase() === 'true';
    }
    autoCreate() {
        const raw = this.config.get('GOOGLE_PUBSUB_AUTO_CREATE_SUBSCRIPTION');
        return (raw ?? 'false').toLowerCase() === 'true';
    }
    reconnectMs() {
        const n = Number(this.config.get('GOOGLE_PUBSUB_RECONNECT_MS'));
        return Number.isFinite(n) && n >= 5000 ? n : 60_000;
    }
    parseProjectId(subName) {
        const match = subName.match(/projects\/([^/]+)/);
        return match?.[1];
    }
    projectId(subName) {
        return (this.config.get('GOOGLE_CLOUD_PROJECT') ??
            this.parseProjectId(subName) ??
            '');
    }
    shortName(subName) {
        const match = /subscriptions\/([^/]+)$/.exec(subName);
        return match ? match[1] : subName;
    }
};
exports.GmailSubscriberService = GmailSubscriberService;
exports.GmailSubscriberService = GmailSubscriberService = GmailSubscriberService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        gmail_pubsub_service_1.GmailPubSubService])
], GmailSubscriberService);
//# sourceMappingURL=gmail-subscriber.service.js.map
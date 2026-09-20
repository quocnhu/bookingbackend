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
exports.GmailController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("@/common/decorators/public.decorator");
const permissions_decorator_1 = require("@/common/decorators/permissions.decorator");
const gmail_pubsub_service_1 = require("./gmail-pubsub.service");
const gmail_connect_service_1 = require("./gmail-connect.service");
const gmail_watch_service_1 = require("./gmail-watch.service");
const google_oidc_service_1 = require("./google-oidc.service");
let GmailController = class GmailController {
    pubSubService;
    connectService;
    watchService;
    oidcService;
    constructor(pubSubService, connectService, watchService, oidcService) {
        this.pubSubService = pubSubService;
        this.connectService = connectService;
        this.watchService = watchService;
        this.oidcService = oidcService;
    }
    async webhook(authorization, body) {
        if (!authorization) {
            throw new common_1.BadRequestException('Missing Authorization header');
        }
        const [type, token] = authorization.split(' ');
        if (type !== 'Bearer' || !token) {
            throw new common_1.BadRequestException('Invalid Authorization header');
        }
        await this.oidcService.verifyIdToken(token);
        const message = body?.message;
        if (!message?.data) {
            throw new common_1.BadRequestException('Missing message.data');
        }
        const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
        const payload = {
            emailAddress: decoded.emailAddress,
            historyId: Number(decoded.historyId),
        };
        if (!payload.emailAddress || !payload.historyId) {
            throw new common_1.BadRequestException('Missing emailAddress or historyId');
        }
        const result = await this.pubSubService.handlePush(payload);
        return { received: true, ...result };
    }
    connect(res, accountId) {
        return res.redirect(this.connectService.buildConnectUrl(accountId));
    }
    async callback(code, state, res) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        try {
            const result = await this.connectService.handleCallback(code, state);
            const isReconnect = 'reconnected' in result;
            const status = encodeURIComponent(`${isReconnect ? 'Reconnected' : 'Tracked'} ${result.email}${result.watchExpiration ? ' · watch active' : ''}`);
            return res.redirect(`${frontendUrl}/users?mailbox=${isReconnect ? 'reconnected' : 'connected'}&message=${status}`);
        }
        catch (err) {
            const message = encodeURIComponent(err?.message?.replace?.(/\s+/g, ' ').slice(0, 120) ||
                'Mailbox connect failed');
            return res.redirect(`${frontendUrl}/users?mailbox=error&message=${message}`);
        }
    }
    list() {
        return this.connectService.list();
    }
    remove(id) {
        return this.connectService.remove(id);
    }
    testConnection(id) {
        return this.pubSubService.testConnection(id);
    }
    renewWatch(id) {
        return this.watchService.registerWatchForAccount(id);
    }
    status() {
        return this.watchService.renewExpiringWatches();
    }
};
exports.GmailController = GmailController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GmailController.prototype, "webhook", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('gmail.manage'),
    (0, common_1.Get)('connect'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GmailController.prototype, "connect", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], GmailController.prototype, "callback", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('gmail.manage'),
    (0, common_1.Get)('accounts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GmailController.prototype, "list", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('gmail.manage'),
    (0, common_1.Delete)('accounts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GmailController.prototype, "remove", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('gmail.manage'),
    (0, common_1.Post)('accounts/:id/test'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GmailController.prototype, "testConnection", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('gmail.manage'),
    (0, common_1.Post)('accounts/:id/renew-watch'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GmailController.prototype, "renewWatch", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('gmail.manage'),
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GmailController.prototype, "status", null);
exports.GmailController = GmailController = __decorate([
    (0, common_1.Controller)('gmail'),
    __metadata("design:paramtypes", [gmail_pubsub_service_1.GmailPubSubService,
        gmail_connect_service_1.GmailConnectService,
        gmail_watch_service_1.GmailWatchService,
        google_oidc_service_1.GoogleOidcService])
], GmailController);
//# sourceMappingURL=gmail.controller.js.map
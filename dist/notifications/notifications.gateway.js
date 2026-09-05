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
var NotificationsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    server;
    logger = new common_1.Logger(NotificationsGateway_1.name);
    userSockets = new Map();
    handleConnection(client) {
        const userId = client.handshake.auth?.userId;
        if (userId) {
            client.join(`user:${userId}`);
            const sockets = this.userSockets.get(userId) ?? new Set();
            sockets.add(client.id);
            this.userSockets.set(userId, sockets);
            this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
        }
    }
    handleDisconnect(client) {
        const userId = client.handshake.auth?.userId;
        if (userId) {
            const sockets = this.userSockets.get(userId);
            sockets?.delete(client.id);
            if (sockets?.size === 0)
                this.userSockets.delete(userId);
        }
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handlePing(client) {
        client.emit('pong', { time: new Date().toISOString() });
    }
    notifyUser(userId, event, payload) {
        this.server.to(`user:${userId}`).emit(event, payload);
    }
    notifyAll(event, payload) {
        this.server.emit(event, payload);
    }
    broadcastAssignmentChange(assignmentId, status, affectedUserIds) {
        for (const userId of affectedUserIds) {
            this.notifyUser(userId, 'assignment:changed', { assignmentId, status });
        }
        this.notifyAll('board:refresh', { assignmentId, status });
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], NotificationsGateway.prototype, "handlePing", null);
exports.NotificationsGateway = NotificationsGateway = NotificationsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' }, namespace: '/ws' })
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map
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
var WaitingListCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitingListCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notifications/notification.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const dispatch_policy_service_1 = require("../dispatch-policy/dispatch-policy.service");
const HCM_TIMEZONE = 'Asia/Ho_Chi_Minh';
let WaitingListCron = WaitingListCron_1 = class WaitingListCron {
    prisma;
    notificationService;
    gateway;
    dispatchPolicy;
    logger = new common_1.Logger(WaitingListCron_1.name);
    constructor(prisma, notificationService, gateway, dispatchPolicy) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.gateway = gateway;
        this.dispatchPolicy = dispatchPolicy;
    }
    async scheduled() {
        try {
            const today = this.dispatchPolicy.todayHcm();
            const waiting = await this.prisma.assignment.findMany({
                where: {
                    status: client_1.AssignmentStatus.WAITING_LIST,
                    startDate: { gte: today.start, lte: today.end },
                },
                select: {
                    id: true,
                    code: true,
                    tourName: true,
                    bookings: {
                        where: { status: { not: client_1.BookingStatus.CANCELED } },
                        select: { bookingRef: true, totalPax: true },
                    },
                },
            });
            const pending = waiting.filter((row) => row.bookings.length > 0);
            if (pending.length === 0)
                return;
            const pax = pending.reduce((sum, row) => sum +
                row.bookings.reduce((inner, booking) => inner + (booking.totalPax ?? 0), 0), 0);
            const body = `${pending.length} waiting-list bus(es), ${pax} pax for today. Place them on open buses or contact the guests.`;
            const users = await this.prisma.user.findMany({
                where: {
                    role: { in: [client_1.RoleType.ADMIN, client_1.RoleType.OFFICE] },
                    isActive: true,
                },
                select: { id: true },
            });
            for (const user of users) {
                const notification = await this.notificationService.create(user.id, client_1.NotificationType.GENERAL, 'Waiting list needs placement', body, {
                    kind: 'WAITING_LIST_0500',
                    url: '/bookings',
                });
                this.gateway.notifyUser(user.id, 'notification', notification);
            }
            this.logger.log(`05:00 waiting list alert: buses=${pending.length}, pax=${pax}, admins=${users.length}`);
        }
        catch (error) {
            this.logger.error(`05:00 waiting list alert failed: ${error.message}`);
        }
    }
};
exports.WaitingListCron = WaitingListCron;
__decorate([
    (0, schedule_1.Cron)('0 5 * * *', { timeZone: HCM_TIMEZONE }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WaitingListCron.prototype, "scheduled", null);
exports.WaitingListCron = WaitingListCron = WaitingListCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway,
        dispatch_policy_service_1.DispatchPolicyService])
], WaitingListCron);
//# sourceMappingURL=waiting-list.cron.js.map
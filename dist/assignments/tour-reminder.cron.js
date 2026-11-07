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
var TourReminderCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TourReminderCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const auto_crew_service_1 = require("../queues/auto-crew.service");
const notification_service_1 = require("../notifications/notification.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const HCM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const REMINDER_LOOKBACK_MS = 24 * 60 * 60 * 1000;
let TourReminderCron = TourReminderCron_1 = class TourReminderCron {
    prisma;
    autoCrew;
    notificationService;
    gateway;
    logger = new common_1.Logger(TourReminderCron_1.name);
    running = false;
    constructor(prisma, autoCrew, notificationService, gateway) {
        this.prisma = prisma;
        this.autoCrew = autoCrew;
        this.notificationService = notificationService;
        this.gateway = gateway;
    }
    async scheduled() {
        try {
            const result = await this.sendTomorrowReminders();
            this.logger.log(`23:00 tour reminders: scanned=${result.scanned}, notified=${result.notified}, missingCrew=${result.missingCrew}`);
        }
        catch (error) {
            this.logger.error('23:00 tour reminders failed', error.stack);
        }
    }
    async sendTomorrowReminders(targetDate) {
        if (this.running) {
            return { scanned: 0, notified: 0, missingCrew: 0 };
        }
        this.running = true;
        try {
            await this.fillCrewIfAutomatic();
            return await this.sendRemindersForDate(targetDate ?? this.tomorrowStart());
        }
        finally {
            this.running = false;
        }
    }
    async fillCrewIfAutomatic() {
        const [mode, enabled] = await Promise.all([
            this.prisma.systemSetting.findUnique({ where: { key: 'assignMode' } }),
            this.prisma.systemSetting.findUnique({
                where: { key: 'autoDispatchEnabled' },
            }),
        ]);
        if (mode?.value === 'MANUAL')
            return;
        if ((enabled?.value ?? 'true').toLowerCase() === 'false')
            return;
        const result = await this.autoCrew.assignMissingCrew(1);
        this.logger.log(`23:00 crew fill: scanned=${result.scanned}, guide+${result.guideAssigned}, driver+${result.driverAssigned}`);
    }
    async sendRemindersForDate(targetDate) {
        const start = this.startOfDay(targetDate);
        const end = this.endOfDay(targetDate);
        const assignments = await this.prisma.assignment.findMany({
            where: {
                startDate: { gte: start, lte: end },
                status: {
                    in: [
                        client_1.AssignmentStatus.DRAFT_ASSIGNED,
                        client_1.AssignmentStatus.PENDING,
                        client_1.AssignmentStatus.TRANSFERRED,
                    ],
                },
                executionMode: { not: client_1.AssignmentExecutionMode.OUTSOURCED_PARTNER },
            },
            select: {
                id: true,
                code: true,
                tourName: true,
                startDate: true,
                totalPax: true,
                guideId: true,
                driverId: true,
                pickupInfo: true,
                guide: { select: { id: true, name: true } },
                driver: { select: { id: true, name: true } },
                provider: { select: { id: true, name: true, isCompany: true } },
                vehicle: { select: { plateNumber: true } },
            },
            orderBy: { startDate: 'asc' },
        });
        let notified = 0;
        let missingCrew = 0;
        for (const assignment of assignments) {
            const missing = [];
            if (!assignment.guideId)
                missing.push('tour guide');
            if (!assignment.driverId)
                missing.push('driver');
            if (missing.length > 0) {
                missingCrew++;
                await this.notifyAdmins('Crew missing for tomorrow', `${assignment.tourName ?? assignment.code ?? 'Tour'} · ${this.formatDateTime(assignment.startDate)} is missing ${missing.join(' and ')}.`, 'TOUR_REMINDER_MISSING_CREW', assignment.id);
            }
            const recipients = [assignment.guideId, assignment.driverId].filter((id) => Boolean(id));
            if (recipients.length === 0)
                continue;
            const title = `Tour tomorrow: ${assignment.tourName ?? assignment.code ?? 'Tour'}`;
            const body = this.buildReminderBody(assignment);
            for (const userId of recipients) {
                if (await this.alreadyNotified(userId, assignment.id, 'TOUR_REMINDER')) {
                    continue;
                }
                const notification = await this.notificationService.create(userId, client_1.NotificationType.GENERAL, title, body, {
                    kind: 'TOUR_REMINDER',
                    assignmentId: assignment.id,
                    startDate: assignment.startDate.toISOString(),
                    url: userId === assignment.guideId
                        ? '/tour-guide/my-trips'
                        : '/driver/my-trips',
                });
                this.gateway.notifyUser(userId, 'notification', notification);
                notified++;
            }
        }
        return { scanned: assignments.length, notified, missingCrew };
    }
    buildReminderBody(assignment) {
        const crew = [
            assignment.guide?.name ? `Guide: ${assignment.guide.name}` : null,
            assignment.driver?.name ? `Driver: ${assignment.driver.name}` : null,
            assignment.vehicle?.plateNumber
                ? `Vehicle: ${assignment.vehicle.plateNumber}`
                : null,
        ]
            .filter(Boolean)
            .join(' · ');
        const pickups = Array.isArray(assignment.pickupInfo)
            ? assignment.pickupInfo
                .map((item) => item?.pickup)
                .filter((value) => Boolean(value))
                .slice(0, 3)
                .join('; ')
            : '';
        return [
            this.formatDateTime(assignment.startDate),
            `${assignment.totalPax} pax`,
            crew || null,
            pickups ? `Pickup: ${pickups}` : null,
        ]
            .filter(Boolean)
            .join(' · ');
    }
    async notifyAdmins(title, body, kind, assignmentId) {
        const users = await this.prisma.user.findMany({
            where: {
                role: { in: [client_1.RoleType.ADMIN, client_1.RoleType.OFFICE] },
                isActive: true,
            },
            select: { id: true },
        });
        for (const user of users) {
            if (await this.alreadyNotified(user.id, assignmentId, kind))
                continue;
            const notification = await this.notificationService.create(user.id, client_1.NotificationType.GENERAL, title, body, {
                kind,
                assignmentId,
                url: '/dispatch-board',
            });
            this.gateway.notifyUser(user.id, 'notification', notification);
        }
    }
    async alreadyNotified(userId, assignmentId, kind) {
        const rows = await this.prisma.notification.findMany({
            where: {
                userId,
                createdAt: { gte: new Date(Date.now() - REMINDER_LOOKBACK_MS) },
            },
            select: { data: true },
            take: 100,
        });
        return rows.some((row) => {
            const data = row.data;
            return data?.kind === kind && data?.assignmentId === assignmentId;
        });
    }
    formatDateTime(date) {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: HCM_TIMEZONE,
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    }
    tomorrowStart() {
        const start = this.startOfDay(new Date());
        start.setDate(start.getDate() + 1);
        return start;
    }
    startOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    endOfDay(date) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }
};
exports.TourReminderCron = TourReminderCron;
__decorate([
    (0, schedule_1.Cron)('0 23 * * *', { timeZone: HCM_TIMEZONE }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TourReminderCron.prototype, "scheduled", null);
exports.TourReminderCron = TourReminderCron = TourReminderCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auto_crew_service_1.AutoCrewService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway])
], TourReminderCron);
//# sourceMappingURL=tour-reminder.cron.js.map
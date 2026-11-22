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
var PickupReminderCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PickupReminderCron = exports.PICKUP_REMINDER_TIME_KEY = exports.PICKUP_REMINDER_ENABLED_KEY = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const mail_service_1 = require("../mail/mail.service");
const pickup_reminder_util_1 = require("./pickup-reminder.util");
exports.PICKUP_REMINDER_ENABLED_KEY = 'pickupReminderEnabled';
exports.PICKUP_REMINDER_TIME_KEY = 'pickupReminderTime';
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const REMINDER_CHANNELS = new Set([
    client_1.BookingProvider.WEBSITE,
    client_1.BookingProvider.MANUAL,
]);
let PickupReminderCron = PickupReminderCron_1 = class PickupReminderCron {
    prisma;
    mail;
    audit;
    logger = new common_1.Logger(PickupReminderCron_1.name);
    running = false;
    constructor(prisma, mail, audit) {
        this.prisma = prisma;
        this.mail = mail;
        this.audit = audit;
    }
    async scheduled() {
        try {
            const result = await this.runNow();
            if (result.checked > 0) {
                this.logger.log(`Pickup reminders: checked=${result.checked}, sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`);
            }
        }
        catch (error) {
            this.logger.error('Pickup reminder cron failed', error.stack);
        }
    }
    async runNow(now = new Date()) {
        if (this.running)
            return { checked: 0, sent: 0, failed: 0, skipped: 0 };
        this.running = true;
        try {
            const settings = await this.getSettings();
            if (!settings.enabled) {
                return { checked: 0, sent: 0, failed: 0, skipped: 0 };
            }
            const configured = (0, pickup_reminder_util_1.hhmmToMinutes)(settings.time);
            if (configured == null) {
                this.logger.warn(`Invalid pickup reminder time "${settings.time}" — skipping`);
                return { checked: 0, sent: 0, failed: 0, skipped: 0 };
            }
            const todayKey = (0, pickup_reminder_util_1.hcmDateKey)(now);
            const nowMinutes = (0, pickup_reminder_util_1.hcmTimeMinutes)(now);
            const windowStart = new Date(now.getTime() - 36 * 60 * 60 * 1000);
            const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000);
            const assignments = await this.prisma.assignment.findMany({
                where: {
                    startDate: { gte: windowStart, lte: windowEnd },
                    pickupReminderMode: client_1.PickupReminderMode.AUTO,
                    status: {
                        in: [
                            client_1.AssignmentStatus.DRAFT_ASSIGNED,
                            client_1.AssignmentStatus.PENDING,
                            client_1.AssignmentStatus.TRANSFERRED,
                            client_1.AssignmentStatus.DISPATCHED,
                        ],
                    },
                },
                select: {
                    id: true,
                    code: true,
                    tourName: true,
                    startDate: true,
                    tourType: true,
                    bookings: {
                        where: {
                            parentBookingId: null,
                            status: { not: client_1.BookingStatus.CANCELED },
                        },
                        select: {
                            id: true,
                            mail: true,
                            channel: true,
                            departureTime: true,
                            pickupReminderSentAt: true,
                            tour: { select: { departureTimes: true } },
                        },
                    },
                },
            });
            let checked = 0;
            let sent = 0;
            let failed = 0;
            let skipped = 0;
            for (const assignment of assignments) {
                if ((0, pickup_reminder_util_1.hcmDateKey)(assignment.startDate) !== todayKey)
                    continue;
                const eligible = assignment.bookings.filter((b) => REMINDER_CHANNELS.has(b.channel) &&
                    EMAIL_RE.test((b.mail ?? '').trim()));
                if (eligible.length === 0)
                    continue;
                const unsent = eligible.filter((b) => !b.pickupReminderSentAt);
                if (unsent.length === 0)
                    continue;
                const earliestPickup = eligible.reduce((min, b) => {
                    const minutes = (0, pickup_reminder_util_1.bookingPickupMinutes)(b.departureTime, b.tour?.departureTimes);
                    if (minutes == null)
                        return min;
                    return min == null ? minutes : Math.min(min, minutes);
                }, null);
                if (!(0, pickup_reminder_util_1.shouldSendReminderNow)({
                    nowMinutes,
                    configuredMinutes: configured,
                    earliestPickupMinutes: earliestPickup,
                })) {
                    continue;
                }
                checked++;
                const result = await this.mail.sendPickupReminders(assignment.id);
                sent += result.sent;
                failed += result.failed;
                skipped += result.skipped;
                if (result.reason && result.sent === 0) {
                    this.logger.warn(`Pickup reminder for ${assignment.tourName ?? assignment.code ?? assignment.id} skipped: ${result.reason}`);
                }
            }
            return { checked, sent, failed, skipped };
        }
        finally {
            this.running = false;
        }
    }
    async getSettings() {
        const rows = await this.prisma.systemSetting.findMany({
            where: {
                key: { in: [exports.PICKUP_REMINDER_ENABLED_KEY, exports.PICKUP_REMINDER_TIME_KEY] },
            },
        });
        const map = new Map(rows.map((row) => [row.key, row.value]));
        const enabled = (map.get(exports.PICKUP_REMINDER_ENABLED_KEY) ?? 'true').toLowerCase() !==
            'false';
        let time = map.get(exports.PICKUP_REMINDER_TIME_KEY) ?? pickup_reminder_util_1.DEFAULT_PICKUP_REMINDER_TIME;
        if (!(0, pickup_reminder_util_1.isValidHhmm)(time))
            time = pickup_reminder_util_1.DEFAULT_PICKUP_REMINDER_TIME;
        return { enabled, time, timezone: pickup_reminder_util_1.PICKUP_REMINDER_TIME_ZONE };
    }
    async updateSettings(input, actorId) {
        if (input.time !== undefined && !(0, pickup_reminder_util_1.isValidHhmm)(input.time)) {
            throw new common_1.BadRequestException('Time must be HH:mm (e.g. 06:00)');
        }
        const before = await this.getSettings();
        const updates = [];
        if (input.enabled !== undefined) {
            updates.push({
                key: exports.PICKUP_REMINDER_ENABLED_KEY,
                value: input.enabled ? 'true' : 'false',
            });
        }
        if (input.time !== undefined) {
            updates.push({ key: exports.PICKUP_REMINDER_TIME_KEY, value: input.time.trim() });
        }
        for (const entry of updates) {
            await this.prisma.systemSetting.upsert({
                where: { key: entry.key },
                update: { value: entry.value },
                create: entry,
            });
        }
        const after = await this.getSettings();
        await this.audit.log({
            entityType: 'SystemSetting',
            entityId: exports.PICKUP_REMINDER_TIME_KEY,
            action: 'UPDATE_PICKUP_REMINDER',
            beforeData: before,
            afterData: after,
            changedBy: actorId ?? null,
        });
        this.logger.log(`Pickup reminder ${after.enabled ? 'enabled' : 'disabled'} at ${after.time} (${after.timezone})`);
        return after;
    }
};
exports.PickupReminderCron = PickupReminderCron;
__decorate([
    (0, schedule_1.Cron)('*/10 * * * *', { timeZone: pickup_reminder_util_1.PICKUP_REMINDER_TIME_ZONE }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PickupReminderCron.prototype, "scheduled", null);
exports.PickupReminderCron = PickupReminderCron = PickupReminderCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        audit_service_1.AuditService])
], PickupReminderCron);
//# sourceMappingURL=pickup-reminder.cron.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchPolicyService = exports.DISPATCH_TIMEZONE = exports.DEFAULT_DISPATCH_OPEN = exports.DEFAULT_DISPATCH_CUTOFF = exports.DEFAULT_AUTO_DISPATCH_CRON = exports.DISPATCH_OPEN_KEY = exports.ASSIGN_MODE_KEY = exports.AUTO_MODE_ACTIVATED_AT_KEY = exports.AUTO_DISPATCH_CRON_KEY = exports.AUTO_DISPATCH_ENABLED_KEY = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
exports.AUTO_DISPATCH_ENABLED_KEY = 'autoDispatchEnabled';
exports.AUTO_DISPATCH_CRON_KEY = 'autoDispatchCron';
exports.AUTO_MODE_ACTIVATED_AT_KEY = 'autoModeActivatedAt';
exports.ASSIGN_MODE_KEY = 'assignMode';
exports.DISPATCH_OPEN_KEY = 'dispatchOpenTime';
exports.DEFAULT_AUTO_DISPATCH_CRON = '0 21 * * *';
exports.DEFAULT_DISPATCH_CUTOFF = '21:00';
exports.DEFAULT_DISPATCH_OPEN = '12:00';
exports.DISPATCH_TIMEZONE = 'Asia/Ho_Chi_Minh';
const HCM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
let DispatchPolicyService = class DispatchPolicyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMode() {
        const rows = await this.prisma.systemSetting.findMany({
            where: {
                key: {
                    in: [
                        exports.ASSIGN_MODE_KEY,
                        exports.AUTO_DISPATCH_ENABLED_KEY,
                        exports.AUTO_DISPATCH_CRON_KEY,
                        exports.AUTO_MODE_ACTIVATED_AT_KEY,
                        exports.DISPATCH_OPEN_KEY,
                    ],
                },
            },
        });
        const map = new Map(rows.map((row) => [row.key, row.value]));
        const assignMode = map.get(exports.ASSIGN_MODE_KEY) === client_1.AssignmentOrigin.MANUAL
            ? client_1.AssignmentOrigin.MANUAL
            : client_1.AssignmentOrigin.AUTO_ASSIGN;
        const enabled = (map.get(exports.AUTO_DISPATCH_ENABLED_KEY) ?? 'true').toLowerCase() !== 'false';
        const cron = map.get(exports.AUTO_DISPATCH_CRON_KEY) || exports.DEFAULT_AUTO_DISPATCH_CRON;
        const openTimeRaw = map.get(exports.DISPATCH_OPEN_KEY) ?? exports.DEFAULT_DISPATCH_OPEN;
        const [openHours, openMinutes] = this.parseHhmm(openTimeRaw);
        const openTime = `${String(openHours).padStart(2, '0')}:${String(openMinutes).padStart(2, '0')}`;
        const activatedRaw = map.get(exports.AUTO_MODE_ACTIVATED_AT_KEY);
        const activatedAt = activatedRaw ? new Date(activatedRaw) : null;
        return {
            autoMode: assignMode === client_1.AssignmentOrigin.AUTO_ASSIGN && enabled,
            assignMode,
            enabled,
            cron,
            cutoffTime: this.cronToCutoff(cron),
            openTime,
            activatedAt: activatedAt && !Number.isNaN(activatedAt.getTime())
                ? activatedAt
                : null,
        };
    }
    async getSealInfo(startDate) {
        const mode = await this.getMode();
        const window = this.dispatchWindow(startDate, mode.cutoffTime, mode.openTime);
        const now = Date.now();
        const sealed = now >= window.closesAt.getTime();
        const urgent = !sealed && now >= window.closesAt.getTime() - 60 * 60 * 1000;
        return {
            sealed,
            urgent,
            autoMode: mode.autoMode,
            cutoffTime: window.cutoffTime,
            cutoffAt: window.closesAt.toISOString(),
            openTime: window.openTime,
            windowOpen: window.open,
            windowOpensAt: window.opensAt.toISOString(),
            activatedAt: mode.activatedAt?.toISOString() ?? null,
            timezone: exports.DISPATCH_TIMEZONE,
        };
    }
    dispatchWindow(startDate, cutoffTime, openTime) {
        const requested = cutoffTime ?? exports.DEFAULT_DISPATCH_CUTOFF;
        const closesAt = this.cutoffFor(startDate, requested);
        const day = this.dayRange(closesAt);
        const [hours, minutes] = this.parseHhmm(openTime ?? exports.DEFAULT_DISPATCH_OPEN);
        let opensAt = new Date(day.start.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);
        if (opensAt.getTime() >= closesAt.getTime()) {
            opensAt = new Date(closesAt.getTime() - 60 * 60 * 1000);
        }
        const [cutoffHours, cutoffMinutes] = this.parseHhmm(requested);
        const [openHours, openMinutes] = this.hcmClockParts(opensAt);
        const now = Date.now();
        return {
            open: now >= opensAt.getTime() && now <= closesAt.getTime(),
            opensAt,
            closesAt,
            openTime: `${String(openHours).padStart(2, '0')}:${String(openMinutes).padStart(2, '0')}`,
            cutoffTime: `${String(cutoffHours).padStart(2, '0')}:${String(cutoffMinutes).padStart(2, '0')}`,
        };
    }
    async windowFor(startDate, cutoffTime) {
        const mode = await this.getMode();
        return this.dispatchWindow(startDate, cutoffTime ?? mode.cutoffTime, mode.openTime);
    }
    windowOrderIsValid(openTime, cutoffTime) {
        const [openHours, openMinutes] = this.parseHhmm(openTime);
        const [cutoffHours, cutoffMinutes] = this.parseHhmm(cutoffTime);
        return openHours * 60 + openMinutes < cutoffHours * 60 + cutoffMinutes;
    }
    async isSealed(startDate) {
        if (!startDate)
            return false;
        return (await this.getSealInfo(startDate)).sealed;
    }
    cutoffFor(startDate, cutoffTime) {
        const date = new Date(startDate);
        const { year, month, day } = this.hcmParts(date);
        const [hours, minutes] = this.parseHhmm(cutoffTime ?? exports.DEFAULT_DISPATCH_CUTOFF);
        const startOfDepartureDay = Date.UTC(year, month - 1, day) - HCM_OFFSET_MS;
        return new Date(startOfDepartureDay -
            DAY_MS +
            hours * 60 * 60 * 1000 +
            minutes * 60 * 1000);
    }
    dayRange(startDate) {
        const date = new Date(startDate);
        const { year, month, day } = this.hcmParts(date);
        const start = new Date(Date.UTC(year, month - 1, day) - HCM_OFFSET_MS);
        return { start, end: new Date(start.getTime() + DAY_MS - 1) };
    }
    dayKey(date) {
        const { year, month, day } = this.hcmParts(new Date(date));
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    todayHcm() {
        return this.dayRange(new Date());
    }
    addDays(date, days) {
        return new Date(date.getTime() + days * DAY_MS);
    }
    latePlacementOpenAt(startDate) {
        return new Date(this.dayRange(startDate).start.getTime() + 5 * 60 * 60 * 1000);
    }
    cronToCutoff(cron) {
        const parts = (cron ?? '').trim().split(/\s+/);
        if (parts.length !== 5)
            return exports.DEFAULT_DISPATCH_CUTOFF;
        const minute = Number(parts[0]);
        const hour = Number(parts[1]);
        if (!Number.isInteger(minute) ||
            !Number.isInteger(hour) ||
            minute < 0 ||
            minute > 59 ||
            hour < 0 ||
            hour > 23) {
            return exports.DEFAULT_DISPATCH_CUTOFF;
        }
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    parseHhmm(time) {
        const value = time ?? exports.DEFAULT_DISPATCH_CUTOFF;
        if (!HHMM_PATTERN.test(value)) {
            const [h, m] = exports.DEFAULT_DISPATCH_CUTOFF.split(':').map(Number);
            return [h, m];
        }
        const [h, m] = value.split(':').map(Number);
        return [h, m];
    }
    hcmParts(date) {
        const shifted = new Date(date.getTime() + HCM_OFFSET_MS);
        return {
            year: shifted.getUTCFullYear(),
            month: shifted.getUTCMonth() + 1,
            day: shifted.getUTCDate(),
        };
    }
    hcmClockParts(date) {
        const shifted = new Date(date.getTime() + HCM_OFFSET_MS);
        return [shifted.getUTCHours(), shifted.getUTCMinutes()];
    }
};
exports.DispatchPolicyService = DispatchPolicyService;
exports.DispatchPolicyService = DispatchPolicyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DispatchPolicyService);
//# sourceMappingURL=dispatch-policy.service.js.map
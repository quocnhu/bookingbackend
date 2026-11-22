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
exports.DispatchPolicyService = exports.DISPATCH_TIMEZONE = exports.DEFAULT_DISPATCH_CUTOFF = exports.DEFAULT_AUTO_DISPATCH_CRON = exports.ASSIGN_MODE_KEY = exports.AUTO_MODE_ACTIVATED_AT_KEY = exports.AUTO_DISPATCH_CRON_KEY = exports.AUTO_DISPATCH_ENABLED_KEY = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
exports.AUTO_DISPATCH_ENABLED_KEY = 'autoDispatchEnabled';
exports.AUTO_DISPATCH_CRON_KEY = 'autoDispatchCron';
exports.AUTO_MODE_ACTIVATED_AT_KEY = 'autoModeActivatedAt';
exports.ASSIGN_MODE_KEY = 'assignMode';
exports.DEFAULT_AUTO_DISPATCH_CRON = '0 23 * * *';
exports.DEFAULT_DISPATCH_CUTOFF = '23:00';
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
        const activatedRaw = map.get(exports.AUTO_MODE_ACTIVATED_AT_KEY);
        const activatedAt = activatedRaw ? new Date(activatedRaw) : null;
        return {
            autoMode: assignMode === client_1.AssignmentOrigin.AUTO_ASSIGN && enabled,
            assignMode,
            enabled,
            cron,
            cutoffTime: this.cronToCutoff(cron),
            activatedAt: activatedAt && !Number.isNaN(activatedAt.getTime())
                ? activatedAt
                : null,
        };
    }
    async getSealInfo(startDate) {
        const date = new Date(startDate);
        const mode = await this.getMode();
        const cutoff = this.cutoffFor(date, mode.cutoffTime);
        const activatedAt = mode.activatedAt ?? new Date(0);
        const now = Date.now();
        const sealed = mode.autoMode &&
            now >= cutoff.getTime() &&
            activatedAt.getTime() <= cutoff.getTime();
        const urgent = !sealed && now >= cutoff.getTime() - 3 * 60 * 60 * 1000;
        return {
            sealed,
            urgent,
            autoMode: mode.autoMode,
            cutoffTime: mode.cutoffTime,
            cutoffAt: cutoff.toISOString(),
            activatedAt: mode.activatedAt?.toISOString() ?? null,
            timezone: exports.DISPATCH_TIMEZONE,
        };
    }
    async isSealed(startDate) {
        if (!startDate)
            return false;
        return (await this.getSealInfo(startDate)).sealed;
    }
    cutoffFor(startDate, cutoffTime) {
        const date = new Date(startDate);
        const time = cutoffTime ?? exports.DEFAULT_DISPATCH_CUTOFF;
        const { year, month, day } = this.hcmParts(date);
        const [hours, minutes] = (HHMM_PATTERN.test(time)
            ? time
            : exports.DEFAULT_DISPATCH_CUTOFF)
            .split(':')
            .map(Number);
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
    hcmParts(date) {
        const shifted = new Date(date.getTime() + HCM_OFFSET_MS);
        return {
            year: shifted.getUTCFullYear(),
            month: shifted.getUTCMonth() + 1,
            day: shifted.getUTCDate(),
        };
    }
};
exports.DispatchPolicyService = DispatchPolicyService;
exports.DispatchPolicyService = DispatchPolicyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DispatchPolicyService);
//# sourceMappingURL=dispatch-policy.service.js.map
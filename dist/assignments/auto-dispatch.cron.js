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
var AutoDispatchCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDispatchCron = exports.AUTO_DISPATCH_TIMEZONE = exports.DEFAULT_AUTO_DISPATCH_CRON = exports.AUTO_DISPATCH_CRON_KEY = exports.AUTO_DISPATCH_ENABLED_KEY = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const cron_1 = require("cron");
const client_1 = require("@prisma/client");
const auto_crew_service_1 = require("../queues/auto-crew.service");
const dispatch_policy_service_1 = require("../dispatch-policy/dispatch-policy.service");
Object.defineProperty(exports, "AUTO_DISPATCH_CRON_KEY", { enumerable: true, get: function () { return dispatch_policy_service_1.AUTO_DISPATCH_CRON_KEY; } });
Object.defineProperty(exports, "AUTO_DISPATCH_ENABLED_KEY", { enumerable: true, get: function () { return dispatch_policy_service_1.AUTO_DISPATCH_ENABLED_KEY; } });
Object.defineProperty(exports, "DEFAULT_AUTO_DISPATCH_CRON", { enumerable: true, get: function () { return dispatch_policy_service_1.DEFAULT_AUTO_DISPATCH_CRON; } });
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const assignments_service_1 = require("./assignments.service");
exports.AUTO_DISPATCH_TIMEZONE = process.env.AUTO_DISPATCH_TIMEZONE || dispatch_policy_service_1.DISPATCH_TIMEZONE;
const AUTO_DISPATCH_JOB = 'auto-dispatch';
let AutoDispatchCron = AutoDispatchCron_1 = class AutoDispatchCron {
    autoCrewService;
    assignmentsService;
    prisma;
    auditService;
    schedulerRegistry;
    dispatchPolicy;
    logger = new common_1.Logger(AutoDispatchCron_1.name);
    constructor(autoCrewService, assignmentsService, prisma, auditService, schedulerRegistry, dispatchPolicy) {
        this.autoCrewService = autoCrewService;
        this.assignmentsService = assignmentsService;
        this.prisma = prisma;
        this.auditService = auditService;
        this.schedulerRegistry = schedulerRegistry;
        this.dispatchPolicy = dispatchPolicy;
    }
    async onModuleInit() {
        try {
            const settings = await this.ensureSettings();
            this.reschedule(settings.cron);
            this.logger.log(`Auto-dispatch ${settings.enabled ? 'enabled' : 'disabled'} at "${settings.cron}" (${exports.AUTO_DISPATCH_TIMEZONE}) — next run: ${this.getNextRun() ?? 'n/a'}`);
        }
        catch (error) {
            this.logger.error('Failed to initialize auto-dispatch schedule', error.stack);
        }
    }
    async getSettings() {
        const settings = await this.ensureSettings();
        return {
            ...settings,
            cutoffTime: this.dispatchPolicy.cronToCutoff(settings.cron),
            timezone: exports.AUTO_DISPATCH_TIMEZONE,
            nextRun: this.getNextRun(),
        };
    }
    async updateSettings(input, actorId) {
        const before = await this.getSettings();
        if (input.cron !== undefined) {
            this.validateCron(input.cron);
            const { openTime } = await this.dispatchPolicy.getMode();
            const newCutoff = this.dispatchPolicy.cronToCutoff(input.cron.trim());
            if (!this.dispatchPolicy.windowOrderIsValid(openTime, newCutoff)) {
                throw new common_1.BadRequestException(`Auto-dispatch cutoff ${newCutoff} must be after the ${openTime} dispatch opening time.`);
            }
        }
        const updates = [];
        if (input.enabled !== undefined) {
            const wasAuto = await this.dispatchPolicy.getMode();
            updates.push({
                key: dispatch_policy_service_1.AUTO_DISPATCH_ENABLED_KEY,
                value: input.enabled ? 'true' : 'false',
            });
            if (input.enabled && !wasAuto.autoMode) {
                updates.push({
                    key: dispatch_policy_service_1.AUTO_MODE_ACTIVATED_AT_KEY,
                    value: new Date().toISOString(),
                });
            }
        }
        if (input.cron !== undefined) {
            updates.push({ key: dispatch_policy_service_1.AUTO_DISPATCH_CRON_KEY, value: input.cron.trim() });
        }
        for (const entry of updates) {
            await this.prisma.systemSetting.upsert({
                where: { key: entry.key },
                update: { value: entry.value },
                create: entry,
            });
        }
        if (input.cron !== undefined) {
            this.reschedule(input.cron.trim());
        }
        const after = await this.getSettings();
        await this.auditService.log({
            entityType: 'SystemSetting',
            entityId: dispatch_policy_service_1.AUTO_DISPATCH_CRON_KEY,
            action: 'UPDATE_AUTO_DISPATCH',
            beforeData: before,
            afterData: after,
            changedBy: actorId ?? null,
        });
        this.logger.log(`Auto-dispatch ${after.enabled ? 'enabled' : 'disabled'} at "${after.cron}" — next run: ${after.nextRun ?? 'n/a'}`);
        return after;
    }
    async ensureSettings() {
        const rows = await this.prisma.systemSetting.findMany({
            where: {
                key: {
                    in: [
                        dispatch_policy_service_1.AUTO_DISPATCH_ENABLED_KEY,
                        dispatch_policy_service_1.AUTO_DISPATCH_CRON_KEY,
                        dispatch_policy_service_1.AUTO_MODE_ACTIVATED_AT_KEY,
                    ],
                },
            },
        });
        const map = new Map(rows.map((row) => [row.key, row.value]));
        let cron = map.get(dispatch_policy_service_1.AUTO_DISPATCH_CRON_KEY) ?? dispatch_policy_service_1.DEFAULT_AUTO_DISPATCH_CRON;
        try {
            this.validateCron(cron);
        }
        catch {
            this.logger.warn(`Invalid stored auto-dispatch cron "${cron}" — falling back to "${dispatch_policy_service_1.DEFAULT_AUTO_DISPATCH_CRON}"`);
            cron = dispatch_policy_service_1.DEFAULT_AUTO_DISPATCH_CRON;
        }
        const enabled = (map.get(dispatch_policy_service_1.AUTO_DISPATCH_ENABLED_KEY) ?? 'true').toLowerCase() !== 'false';
        const defaults = [];
        if (!map.has(dispatch_policy_service_1.AUTO_DISPATCH_CRON_KEY)) {
            defaults.push({ key: dispatch_policy_service_1.AUTO_DISPATCH_CRON_KEY, value: cron });
        }
        if (!map.has(dispatch_policy_service_1.AUTO_DISPATCH_ENABLED_KEY)) {
            defaults.push({
                key: dispatch_policy_service_1.AUTO_DISPATCH_ENABLED_KEY,
                value: enabled ? 'true' : 'false',
            });
        }
        if (!map.has(dispatch_policy_service_1.AUTO_MODE_ACTIVATED_AT_KEY)) {
            defaults.push({
                key: dispatch_policy_service_1.AUTO_MODE_ACTIVATED_AT_KEY,
                value: new Date(0).toISOString(),
            });
        }
        for (const entry of defaults) {
            await this.prisma.systemSetting.upsert({
                where: { key: entry.key },
                update: {},
                create: entry,
            });
        }
        return { enabled, cron };
    }
    validateCron(cron) {
        if (!cron || !cron.trim()) {
            throw new common_1.BadRequestException('Cron expression is required');
        }
        try {
            new cron_1.CronTime(cron.trim(), exports.AUTO_DISPATCH_TIMEZONE);
        }
        catch {
            throw new common_1.BadRequestException(`Invalid cron expression "${cron}". Example: "0 21 * * *" (daily at 21:00).`);
        }
    }
    reschedule(cron) {
        if (this.schedulerRegistry.doesExist('cron', AUTO_DISPATCH_JOB)) {
            this.schedulerRegistry.deleteCronJob(AUTO_DISPATCH_JOB);
        }
        const job = cron_1.CronJob.from({
            cronTime: cron,
            onTick: () => this.runScheduledDispatch(),
            start: true,
            timeZone: exports.AUTO_DISPATCH_TIMEZONE,
        });
        this.schedulerRegistry.addCronJob(AUTO_DISPATCH_JOB, job);
    }
    getNextRun() {
        try {
            const job = this.schedulerRegistry.getCronJob(AUTO_DISPATCH_JOB);
            return job.nextDate().toJSDate().toISOString();
        }
        catch {
            return null;
        }
    }
    async runScheduledDispatch() {
        const settings = await this.ensureSettings();
        if (!settings.enabled) {
            this.logger.log('Auto-dispatch disabled — skipping scheduled run');
            return;
        }
        this.logger.log('Auto-dispatch started: auto crew + tomorrow dispatch');
        try {
            const crewResult = await this.autoCrewService.assignMissingCrew(1);
            this.logger.log(`Auto crew: scanned=${crewResult.scanned}, guide+${crewResult.guideAssigned}, driver+${crewResult.driverAssigned}`);
        }
        catch (error) {
            this.logger.error('Auto crew failed', error.stack);
        }
        const modeRow = await this.prisma.systemSetting.findUnique({
            where: { key: 'assignMode' },
        });
        if (modeRow?.value === client_1.AssignmentOrigin.MANUAL) {
            this.logger.log('Manual mode — skipping auto-dispatch (admin must dispatch by 21:00)');
            return;
        }
        const today = this.dispatchPolicy.todayHcm();
        const tomorrow = this.dispatchPolicy.addDays(today.start, 1);
        try {
            const dispatch = await this.assignmentsService.dispatchAllBoard(tomorrow, { ignoreWindow: true });
            this.logger.log(`Auto dispatch (${this.dispatchPolicy.dayKey(tomorrow)}): dispatched=${dispatch.dispatched}, skipped=${dispatch.skipped}, skippedOnLeave=${dispatch.skippedOnLeave}, skippedUnpaid=${dispatch.skippedUnpaid}, skippedUnconfirmed=${dispatch.skippedUnconfirmed}, skippedProvider=${dispatch.skippedProvider}`);
        }
        catch (error) {
            this.logger.error('Auto dispatch failed', error.stack);
        }
    }
};
exports.AutoDispatchCron = AutoDispatchCron;
exports.AutoDispatchCron = AutoDispatchCron = AutoDispatchCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auto_crew_service_1.AutoCrewService,
        assignments_service_1.AssignmentsService,
        prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        schedule_1.SchedulerRegistry,
        dispatch_policy_service_1.DispatchPolicyService])
], AutoDispatchCron);
//# sourceMappingURL=auto-dispatch.cron.js.map
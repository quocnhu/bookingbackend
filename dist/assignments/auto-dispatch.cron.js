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
exports.AutoDispatchCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const auto_crew_service_1 = require("../queues/auto-crew.service");
const prisma_service_1 = require("../prisma/prisma.service");
const assignments_service_1 = require("./assignments.service");
let AutoDispatchCron = AutoDispatchCron_1 = class AutoDispatchCron {
    autoCrewService;
    assignmentsService;
    prisma;
    logger = new common_1.Logger(AutoDispatchCron_1.name);
    constructor(autoCrewService, assignmentsService, prisma) {
        this.autoCrewService = autoCrewService;
        this.assignmentsService = assignmentsService;
        this.prisma = prisma;
    }
    async autoDispatchAt4am() {
        this.logger.log('4am cron started: auto crew + dispatch');
        try {
            const crewResult = await this.autoCrewService.assignMissingCrew();
            this.logger.log(`Auto crew: scanned=${crewResult.scanned}, guide+${crewResult.guideAssigned}, driver+${crewResult.driverAssigned}`);
        }
        catch (error) {
            this.logger.error('Auto crew failed', error.stack);
        }
        const modeRow = await this.prisma.systemSetting.findUnique({
            where: { key: 'assignMode' },
        });
        if (modeRow?.value === client_1.AssignmentOrigin.MANUAL) {
            this.logger.log('Manual mode — skipping 4am auto-dispatch (admin dispatches by hand)');
            return;
        }
        try {
            const dispatch = await this.assignmentsService.dispatchAllBoard();
            this.logger.log(`Auto dispatch: dispatched=${dispatch.dispatched}`);
        }
        catch (error) {
            this.logger.error('Auto dispatch failed', error.stack);
        }
    }
};
exports.AutoDispatchCron = AutoDispatchCron;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_4AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutoDispatchCron.prototype, "autoDispatchAt4am", null);
exports.AutoDispatchCron = AutoDispatchCron = AutoDispatchCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auto_crew_service_1.AutoCrewService,
        assignments_service_1.AssignmentsService,
        prisma_service_1.PrismaService])
], AutoDispatchCron);
//# sourceMappingURL=auto-dispatch.cron.js.map
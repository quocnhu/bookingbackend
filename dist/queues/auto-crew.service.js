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
var AutoCrewService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoCrewService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const guide_confirmation_service_1 = require("../guide-confirmation/guide-confirmation.service");
const crew_availability_util_1 = require("../common/utils/crew-availability.util");
let AutoCrewService = AutoCrewService_1 = class AutoCrewService {
    prisma;
    audit;
    guideConfirmation;
    logger = new common_1.Logger(AutoCrewService_1.name);
    constructor(prisma, audit, guideConfirmation) {
        this.prisma = prisma;
        this.audit = audit;
        this.guideConfirmation = guideConfirmation;
    }
    async assignCrewForBus(assignmentId) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            select: {
                id: true,
                code: true,
                startDate: true,
                endDate: true,
                guideId: true,
                driverId: true,
                providerId: true,
                provider: { select: { isCompany: true } },
                executionMode: true,
            },
        });
        if (!assignment)
            return { assigned: false };
        if (assignment.executionMode === client_1.AssignmentExecutionMode.OUTSOURCED_PARTNER)
            return { assigned: false };
        const needsGuide = assignment.executionMode !== client_1.AssignmentExecutionMode.COMPANY_DRIVER_ONLY;
        if ((!needsGuide || assignment.guideId) && assignment.driverId)
            return { assigned: false };
        const { start, end } = (0, crew_availability_util_1.tripDayRange)(assignment.startDate, assignment.endDate);
        const updates = {};
        if (needsGuide && !assignment.guideId) {
            const guide = await this.pickUser(client_1.RoleType.TOUR_GUIDE, assignment.id, start, end, assignment.providerId);
            if (guide)
                updates.guideId = guide.id;
        }
        if (!assignment.driverId) {
            const externalProvider = !!assignment.providerId && assignment.provider?.isCompany === false;
            if (!externalProvider) {
                const onlyCompany = !assignment.providerId;
                const driver = await this.pickUser(client_1.RoleType.DRIVER, assignment.id, start, end, assignment.providerId, onlyCompany);
                if (driver) {
                    updates.driverId = driver.id;
                    if (!assignment.providerId && driver.providerId) {
                        updates.providerId = driver.providerId;
                    }
                }
            }
        }
        if (updates.guideId || updates.driverId || updates.providerId) {
            await this.prisma.assignment.update({
                where: { id: assignment.id },
                data: updates,
            });
            if (updates.guideId) {
                void this.guideConfirmation
                    .request(assignment.id)
                    .catch((error) => this.logger.warn(`Guide confirmation request failed for ${assignment.code ?? assignment.id}: ${error.message}`));
            }
            await this.audit.log({
                entityType: 'Assignment',
                entityId: assignment.id,
                action: 'AUTO_ASSIGN_CREW',
                afterData: { code: assignment.code, ...updates },
                changedBy: null,
            });
        }
        return { assigned: updates.guideId || updates.driverId, updates };
    }
    async assignMissingCrew(horizonDays = 7) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const end = new Date(startOfToday);
        end.setDate(end.getDate() + horizonDays);
        end.setHours(23, 59, 59, 999);
        const assignments = await this.prisma.assignment.findMany({
            where: {
                status: {
                    in: [client_1.AssignmentStatus.DRAFT_ASSIGNED, client_1.AssignmentStatus.PENDING],
                },
                startDate: { lte: end },
                endDate: { gte: startOfToday },
                bookings: { some: {} },
                OR: [{ guideId: null }, { driverId: null }],
            },
            select: {
                id: true,
                code: true,
                startDate: true,
                endDate: true,
                guideId: true,
                driverId: true,
                providerId: true,
            },
            orderBy: { startDate: 'asc' },
        });
        let guideAssigned = 0;
        let driverAssigned = 0;
        for (const a of assignments) {
            const result = await this.assignCrewForBus(a.id);
            if (result.updates?.guideId)
                guideAssigned++;
            if (result.updates?.driverId)
                driverAssigned++;
        }
        return { scanned: assignments.length, guideAssigned, driverAssigned };
    }
    async pickUser(role, excludeAssignmentId, start, end, providerId, onlyCompany = false) {
        const users = await this.prisma.user.findMany({
            where: { isActive: true, role },
            select: {
                id: true,
                name: true,
                providerId: true,
                guideProfile: { select: { type: true, rating: true } },
                driverProfile: { select: { rating: true } },
                provider: { select: { isCompany: true } },
            },
        });
        const unavailable = await (0, crew_availability_util_1.unavailableCrewIds)(this.prisma, role === client_1.RoleType.TOUR_GUIDE ? 'guide' : 'driver', users.map((u) => u.id), start, end, excludeAssignmentId);
        const candidates = [];
        for (const u of users) {
            if (unavailable.has(u.id))
                continue;
            const isCompany = !!u.provider?.isCompany;
            if (role === client_1.RoleType.DRIVER) {
                if (onlyCompany && !isCompany)
                    continue;
                if (providerId && !isCompany && u.providerId !== providerId)
                    continue;
            }
            let company = 0;
            if (role === client_1.RoleType.DRIVER) {
                if (isCompany)
                    company = 2;
                else if (u.providerId && u.providerId === providerId)
                    company = 1;
            }
            else if (u.guideProfile?.type === client_1.GuideType.OFFICIAL) {
                company = 2;
            }
            const rating = role === client_1.RoleType.DRIVER
                ? (u.driverProfile?.rating ?? 0)
                : (u.guideProfile?.rating ?? 0);
            candidates.push({
                id: u.id,
                providerId: u.providerId,
                isCompany,
                company,
                rating,
                name: u.name ?? '',
            });
        }
        candidates.sort((a, b) => b.company - a.company ||
            b.rating - a.rating ||
            a.name.localeCompare(b.name));
        const best = candidates[0];
        return best
            ? {
                id: best.id,
                providerId: best.providerId,
                isCompany: best.isCompany,
            }
            : null;
    }
};
exports.AutoCrewService = AutoCrewService;
exports.AutoCrewService = AutoCrewService = AutoCrewService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        guide_confirmation_service_1.GuideConfirmationService])
], AutoCrewService);
//# sourceMappingURL=auto-crew.service.js.map
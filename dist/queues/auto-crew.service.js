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
const leaves_service_1 = require("../leaves/leaves.service");
const audit_service_1 = require("../audit/audit.service");
let AutoCrewService = AutoCrewService_1 = class AutoCrewService {
    prisma;
    leaves;
    audit;
    logger = new common_1.Logger(AutoCrewService_1.name);
    constructor(prisma, leaves, audit) {
        this.prisma = prisma;
        this.leaves = leaves;
        this.audit = audit;
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
            },
        });
        if (!assignment)
            return { assigned: false };
        if (assignment.guideId && assignment.driverId)
            return { assigned: false };
        const start = this.normalizeStart(assignment.startDate);
        const end = this.normalizeEnd(assignment.endDate);
        const updates = {};
        if (!assignment.guideId) {
            const guideId = await this.pickUserId(client_1.RoleType.TOUR_GUIDE, assignment.id, start, end, assignment.providerId);
            if (guideId)
                updates.guideId = guideId;
        }
        if (!assignment.driverId) {
            const driverId = await this.pickUserId(client_1.RoleType.DRIVER, assignment.id, start, end, assignment.providerId);
            if (driverId)
                updates.driverId = driverId;
        }
        if (updates.guideId || updates.driverId) {
            await this.prisma.assignment.update({
                where: { id: assignment.id },
                data: updates,
            });
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
    normalizeStart(d) {
        const s = new Date(d);
        s.setHours(0, 0, 0, 0);
        return s;
    }
    normalizeEnd(d) {
        const e = new Date(d);
        e.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        return e;
    }
    async pickUserId(role, excludeAssignmentId, start, end, providerId) {
        const busy = await this.busyUserIds(role, start, end, excludeAssignmentId);
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
        const candidates = [];
        for (const u of users) {
            if (busy.has(u.id))
                continue;
            const onLeave = await this.leaves.hasLeaveConflict(u.id, start, end);
            if (onLeave)
                continue;
            let company = 0;
            if (role === client_1.RoleType.DRIVER) {
                if (u.provider?.isCompany)
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
            candidates.push({ id: u.id, company, rating, name: u.name ?? '' });
        }
        candidates.sort((a, b) => b.company - a.company || b.rating - a.rating || a.name.localeCompare(b.name));
        return candidates[0]?.id ?? null;
    }
    async busyUserIds(role, start, end, excludeAssignmentId) {
        const field = role === client_1.RoleType.DRIVER ? 'driverId' : 'guideId';
        const rows = await this.prisma.assignment.findMany({
            where: {
                status: {
                    notIn: [client_1.AssignmentStatus.CANCELED, client_1.AssignmentStatus.COMPLETED],
                },
                id: { not: excludeAssignmentId },
                [field]: { not: null },
                startDate: { lte: end },
                endDate: { gte: start },
            },
            select: {
                driverId: true,
                guideId: true,
            },
        });
        const ids = rows
            .map((r) => r[field])
            .filter((x) => Boolean(x));
        return new Set(ids);
    }
};
exports.AutoCrewService = AutoCrewService;
exports.AutoCrewService = AutoCrewService = AutoCrewService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        leaves_service_1.LeavesService,
        audit_service_1.AuditService])
], AutoCrewService);
//# sourceMappingURL=auto-crew.service.js.map
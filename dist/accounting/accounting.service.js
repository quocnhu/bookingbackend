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
exports.AccountingService = exports.PAYEE_LABELS = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const notification_service_1 = require("../notifications/notification.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const client_2 = require("@prisma/client");
const PAYABLE_ROLES = [client_1.RoleType.TOUR_GUIDE, client_1.RoleType.DRIVER];
exports.PAYEE_LABELS = {
    [client_1.PayeeType.TRANSPORT_PROVIDER]: 'Transportation Provider',
    [client_1.PayeeType.COMPANY_GUIDE]: 'Company Tour Guide',
    [client_1.PayeeType.COMPANY_DRIVER]: 'Company Driver',
    [client_1.PayeeType.FREELANCE]: 'Freelance (driver & guide)',
};
const num = (v) => Number(v ?? 0);
const round2 = (v) => Math.round(v * 100) / 100;
let AccountingService = class AccountingService {
    prisma;
    audit;
    notificationService;
    gateway;
    constructor(prisma, audit, notificationService, gateway) {
        this.prisma = prisma;
        this.audit = audit;
        this.notificationService = notificationService;
        this.gateway = gateway;
    }
    assertAccounting(actor, perm) {
        if (actor.role === client_1.RoleType.ADMIN)
            return;
        if (actor.role !== client_1.RoleType.OFFICE) {
            throw new common_1.ForbiddenException('Accounting Room is staff only');
        }
        if (perm && !actor.permissions?.includes(perm)) {
            throw new common_1.ForbiddenException(`Missing permission: ${perm}`);
        }
    }
    async assertPayable(personId) {
        const person = await this.prisma.user.findUnique({
            where: { id: personId },
            select: { id: true, name: true, role: true },
        });
        if (!person)
            throw new common_1.NotFoundException('Person not found');
        if (!PAYABLE_ROLES.includes(person.role)) {
            throw new common_1.BadRequestException('Only tour guides and drivers can be paid out');
        }
        return { id: person.id, name: person.name ?? '—', role: person.role };
    }
    range(fromDate, toDate) {
        const from = new Date(fromDate);
        const to = new Date(`${toDate}T23:59:59.999`);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            throw new common_1.BadRequestException('Invalid date range');
        }
        if (from > to)
            throw new common_1.BadRequestException('fromDate must be <= toDate');
        return { from, to };
    }
    async listCategories(actor) {
        this.assertAccounting(actor);
        return this.prisma.settlementCategory.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async createCategory(actor, dto) {
        this.assertAccounting(actor, 'accounting.category.create');
        const existing = await this.prisma.settlementCategory.findUnique({
            where: { code: dto.code },
        });
        if (existing) {
            throw new common_1.ConflictException(`Category code "${dto.code}" already exists`);
        }
        const created = await this.prisma.settlementCategory.create({
            data: {
                code: dto.code,
                name: dto.name,
                flowType: dto.flowType,
            },
        });
        await this.audit.log({
            entityType: 'SettlementCategory',
            entityId: created.id,
            action: 'CREATE',
            afterData: created,
            changedBy: actor.id,
        });
        return created;
    }
    async assertTourMutable(assignmentId) {
        const report = await this.prisma.tourReport.findUnique({
            where: { assignmentId },
            select: { moneyVerifiedAt: true },
        });
        if (report?.moneyVerifiedAt) {
            throw new common_1.ConflictException('Tour money is locked (verified by Accounting). Post a reversing entry instead of editing.');
        }
    }
    async assertOwnTour(assignmentId, actor) {
        if (actor.role === client_1.RoleType.ADMIN || actor.role === client_1.RoleType.OFFICE)
            return;
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            select: { guideId: true, driverId: true },
        });
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        if (actor.id !== assignment.guideId && actor.id !== assignment.driverId) {
            throw new common_1.ForbiddenException('You can only see money for your own tour');
        }
    }
    async tourMoney(actor, assignmentId) {
        await this.assertOwnTour(assignmentId, actor);
        const [rows, categories, report] = await Promise.all([
            this.prisma.settlement.findMany({
                where: { assignmentId },
                include: {
                    category: {
                        select: { id: true, code: true, name: true, flowType: true },
                    },
                    booking: {
                        select: {
                            id: true,
                            bookingRef: true,
                            customerName: true,
                            totalPax: true,
                        },
                    },
                },
                orderBy: { createdAt: 'asc' },
            }),
            this.prisma.settlementCategory.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, code: true, name: true, flowType: true },
            }),
            this.prisma.tourReport.findUnique({
                where: { assignmentId },
                select: {
                    moneyVerifiedAt: true,
                    moneyVerifiedByName: true,
                    moneyRejectedAt: true,
                },
            }),
        ]);
        const net = this.sumRows(rows);
        return {
            rows,
            categories,
            ...net,
            locked: !!report?.moneyVerifiedAt,
            lockedBy: report?.moneyVerifiedByName ?? null,
            returnedForRecheck: !!report?.moneyRejectedAt,
        };
    }
    async addTourMoney(actor, assignmentId, dto) {
        await this.assertOwnTour(assignmentId, actor);
        return this.createSettlementCore(actor, assignmentId, dto);
    }
    async listSettlements(actor, assignmentId) {
        this.assertAccounting(actor);
        return this.prisma.settlement.findMany({
            where: { assignmentId },
            include: {
                category: true,
                booking: { select: { bookingRef: true, customerName: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async createSettlement(actor, assignmentId, dto) {
        this.assertAccounting(actor, 'accounting.settlement.create');
        return this.createSettlementCore(actor, assignmentId, dto);
    }
    async createSettlementCore(actor, assignmentId, dto) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            select: { id: true, code: true, guideId: true, driverId: true },
        });
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        await this.assertTourMutable(assignmentId);
        if (dto.bookingId) {
            const booking = await this.prisma.booking.findUnique({
                where: { id: dto.bookingId },
                select: { assignmentId: true },
            });
            if (!booking)
                throw new common_1.NotFoundException('Booking not found');
            if (booking.assignmentId !== assignmentId) {
                throw new common_1.BadRequestException('Booking does not belong to this tour');
            }
        }
        const created = await this.prisma.settlement.create({
            data: {
                amount: new client_1.Prisma.Decimal(dto.amount),
                note: dto.note ?? null,
                assignmentId,
                bookingId: dto.bookingId ?? null,
                categoryId: dto.categoryId ?? null,
                createdById: actor.id,
                createdByName: actor.name ?? null,
            },
            include: { category: true },
        });
        await this.audit.log({
            entityType: 'Settlement',
            entityId: created.id,
            action: 'CREATE',
            afterData: created,
            changedBy: actor.id,
        });
        return created;
    }
    async updateSettlement(actor, id, dto) {
        this.assertAccounting(actor, 'accounting.settlement.update');
        const existing = await this.prisma.settlement.findUnique({
            where: { id },
            include: { reversedBy: { select: { id: true } } },
        });
        if (!existing)
            throw new common_1.NotFoundException('Settlement not found');
        if (existing.createdById !== actor.id && actor.role !== client_1.RoleType.ADMIN) {
            throw new common_1.ForbiddenException('You can only edit an entry you added');
        }
        if (existing.reversedBy) {
            throw new common_1.ConflictException('Entry was reversed — create a new entry');
        }
        if (existing.assignmentId)
            await this.assertTourMutable(existing.assignmentId);
        const updated = await this.prisma.settlement.update({
            where: { id },
            data: {
                ...(dto.amount !== undefined
                    ? { amount: new client_1.Prisma.Decimal(dto.amount) }
                    : {}),
                ...(dto.note !== undefined ? { note: dto.note } : {}),
                ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
            },
        });
        await this.audit.log({
            entityType: 'Settlement',
            entityId: id,
            action: 'UPDATE',
            beforeData: existing,
            afterData: updated,
            changedBy: actor.id,
        });
        return updated;
    }
    async deleteTourMoney(actor, assignmentId, settlementId) {
        await this.assertOwnTour(assignmentId, actor);
        const entry = await this.prisma.settlement.findUnique({
            where: { id: settlementId },
            include: { reversedBy: { select: { id: true } } },
        });
        if (!entry || entry.assignmentId !== assignmentId) {
            throw new common_1.NotFoundException('This entry does not belong to this trip');
        }
        if (entry.createdById !== actor.id && actor.role !== client_1.RoleType.ADMIN) {
            throw new common_1.ForbiddenException('You can only delete an entry you added');
        }
        if (entry.reversedBy) {
            throw new common_1.ConflictException('Cannot delete a reversed entry');
        }
        if (entry.reversesId) {
            throw new common_1.ConflictException('Cannot delete a reversal entry');
        }
        await this.assertTourMutable(assignmentId);
        const deleted = await this.prisma.settlement.delete({
            where: { id: settlementId },
        });
        await this.audit.log({
            entityType: 'Settlement',
            entityId: settlementId,
            action: 'DELETE',
            beforeData: entry,
            changedBy: actor.id,
        });
        return deleted;
    }
    async deleteSettlement(actor, id) {
        this.assertAccounting(actor, 'accounting.settlement.delete');
        const original = await this.prisma.settlement.findUnique({
            where: { id },
            include: { reversedBy: { select: { id: true } } },
        });
        if (!original)
            throw new common_1.NotFoundException('Settlement not found');
        if (original.createdById !== actor.id && actor.role !== client_1.RoleType.ADMIN) {
            throw new common_1.ForbiddenException('You can only delete an entry you added');
        }
        if (original.reversedBy) {
            throw new common_1.ConflictException('Cannot delete a reversed entry');
        }
        if (original.reversesId) {
            throw new common_1.ConflictException('Cannot delete a reversal entry; delete the original instead');
        }
        if (original.assignmentId) {
            await this.assertTourMutable(original.assignmentId);
        }
        const deleted = await this.prisma.settlement.delete({
            where: { id },
        });
        await this.audit.log({
            entityType: 'Settlement',
            entityId: id,
            action: 'DELETE',
            beforeData: original,
            changedBy: actor.id,
        });
        return deleted;
    }
    sumRows(rows) {
        let collected = 0;
        let paid = 0;
        for (const r of rows) {
            const amount = num(r.amount);
            const flow = r.category?.flowType ?? client_1.FeeFlowType.PAY_MONEY;
            if (flow === client_1.FeeFlowType.COLLECT_MONEY)
                collected += amount;
            else
                paid += amount;
        }
        return {
            collected: round2(collected),
            paid: round2(paid),
            net: round2(collected - paid),
            flow: collected >= paid ? client_1.FeeFlowType.COLLECT_MONEY : client_1.FeeFlowType.PAY_MONEY,
            entryCount: rows.length,
        };
    }
    async computeNet(assignmentId) {
        const rows = await this.prisma.settlement.findMany({
            where: { assignmentId },
            include: {
                category: { select: { code: true, name: true, flowType: true } },
            },
        });
        return this.sumRows(rows);
    }
    resolveDefaultPayee(a) {
        if (a.guideId)
            return { id: a.guideId, basis: 'ASSIGNMENT_GUIDE' };
        return null;
    }
    async verificationQueue(actor) {
        this.assertAccounting(actor);
        const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
        const assignments = await this.prisma.assignment.findMany({
            where: {
                OR: [
                    {
                        tourReport: {
                            is: {
                                status: { in: ['SUBMITTED', 'VERIFIED'] },
                                moneyVerifiedAt: null,
                                moneyRejectedAt: null,
                            },
                        },
                    },
                    {
                        tourReport: {
                            is: {
                                status: 'VERIFIED',
                                moneyVerifiedAt: { gte: sevenDaysAgo },
                            },
                        },
                    },
                ],
            },
            include: {
                tourReport: true,
                vehicle: { select: { plateNumber: true } },
                guide: { select: { id: true, name: true } },
                driver: { select: { id: true, name: true } },
                _count: { select: { settlements: true } },
            },
            orderBy: [{ startDate: 'asc' }, { code: 'asc' }, { id: 'asc' }],
        });
        const now = Date.now();
        const items = await Promise.all(assignments.map(async (a) => {
            const net = await this.computeNet(a.id);
            const ageDays = a.tourReport?.submittedAt
                ? Math.floor((now - +a.tourReport.submittedAt) / 86_400_000)
                : 0;
            return {
                assignmentId: a.id,
                code: a.code,
                tourName: a.tourName,
                tourType: a.tourType,
                submittedAt: a.tourReport?.submittedAt ?? null,
                reportStatus: a.tourReport?.status ?? null,
                moneyVerifiedAt: a.tourReport?.moneyVerifiedAt ?? null,
                guide: a.guide,
                driver: a.driver,
                plateNumber: a.vehicle?.plateNumber,
                suggestedPayableTo: (() => {
                    const d = this.resolveDefaultPayee(a);
                    if (!d)
                        return null;
                    const person = a.guide?.id === d.id ? a.guide : a.driver;
                    return person ? { ...person, basis: d.basis } : null;
                })(),
                net: net.net,
                flow: net.flow,
                collected: net.collected,
                paid: net.paid,
                entryCount: net.entryCount,
                waitingDays: ageDays,
            };
        }));
        return items;
    }
    async verifyTourMoney(actor, assignmentId, dto) {
        this.assertAccounting(actor, 'accounting.money.verify');
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: { tourReport: true },
        });
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        if (!assignment.tourReport?.submittedAt) {
            throw new common_1.ConflictException('Tour report has not been submitted yet');
        }
        if (assignment.tourReport.moneyVerifiedAt) {
            throw new common_1.ConflictException('Tour money was already verified and locked');
        }
        if (assignment.tourReport.moneyRejectedAt) {
            throw new common_1.ConflictException('Tour money was returned to the submitter — waiting for them to re-submit');
        }
        const payableToId = this.resolveDefaultPayee(assignment)?.id ?? null;
        if (!payableToId) {
            throw new common_1.BadRequestException('This trip has no guide yet, so the payee cannot be determined');
        }
        if (dto.payableToId && dto.payableToId !== payableToId) {
            throw new common_1.BadRequestException('The payee is the guide on the assignment and cannot be changed');
        }
        await this.assertPayable(payableToId);
        const net = await this.computeNet(assignmentId);
        if (net.entryCount === 0) {
            throw new common_1.ConflictException('Tour has no settlement entries — add at least one Collect/Expense entry before verifying');
        }
        const now = new Date();
        const updated = await this.prisma.$transaction(async (tx) => {
            const report = await tx.tourReport.update({
                where: { assignmentId },
                data: {
                    settlementFlow: net.flow,
                    netAmount: new client_1.Prisma.Decimal(net.net),
                    moneyPayableToId: payableToId,
                    moneyVerifiedById: actor.id,
                    moneyVerifiedByName: actor.name ?? null,
                    moneyVerifiedAt: now,
                    moneyVerificationNote: dto.note ?? null,
                    moneyRejectedAt: null,
                    moneyRejectedById: null,
                    moneyRejectedByName: null,
                    moneyRejectionReason: null,
                    status: 'VERIFIED',
                    finalizedById: actor.id,
                    finalizedByName: actor.name ?? null,
                    finalizedAt: now,
                },
            });
            await tx.assignment.update({
                where: { id: assignmentId },
                data: {
                    status: client_1.AssignmentStatus.COMPLETED,
                    reportVerifierId: actor.id,
                },
            });
            return report;
        });
        await this.notifySubmitter(assignment, {
            type: client_2.NotificationType.MONEY_VERIFIED,
            title: `✅ Money sheet "${assignment.code}" has been confirmed`,
            body: `Accounting has checked the money for trip ${assignment.tourName ?? ''} and locked the money for ${await this.payeeName(payableToId)}.`,
        });
        await this.audit.log({
            entityType: 'TourReport',
            entityId: updated.id,
            action: 'VERIFY_MONEY',
            afterData: {
                netAmount: net.net,
                flow: net.flow,
                payableToId,
                note: dto.note ?? null,
            },
            changedBy: actor.id,
        });
        this.gateway.notifyAll('board:refresh', {
            assignmentId,
            action: 'money_verified',
        });
        return { ...updated, net, payableToId };
    }
    async payeeName(userId) {
        const u = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });
        return u?.name ?? userId;
    }
    async notifySubmitter(assignment, msg) {
        const to = assignment.tourReport?.submittedById ?? null;
        if (!to)
            return;
        const notif = await this.notificationService.create(to, msg.type, msg.title, msg.body, {
            assignmentId: assignment.id,
        });
        this.gateway.notifyUser(to, 'notification', notif);
    }
    async rejectMoney(assignmentId, dto, actor) {
        this.assertAccounting(actor, 'accounting.money.reject');
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: { tourReport: true },
        });
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        if (!assignment.tourReport) {
            throw new common_1.NotFoundException('This tour has no submitted money sheet');
        }
        if (!assignment.tourReport.submittedAt) {
            throw new common_1.ConflictException('Tour report has not been submitted yet');
        }
        if (assignment.tourReport.moneyVerifiedAt) {
            throw new common_1.ConflictException('Tour money was already verified and locked');
        }
        const updated = await this.prisma.tourReport.update({
            where: { assignmentId },
            data: {
                moneyRejectedAt: new Date(),
                moneyRejectedById: actor.id,
                moneyRejectedByName: actor.name ?? null,
                moneyRejectionReason: dto.reason,
            },
        });
        await this.notifySubmitter(assignment, {
            type: client_2.NotificationType.MONEY_REJECTED,
            title: `❌ Money sheet "${assignment.code}" was sent back`,
            body: `Accounting sent back the revenue/expense money sheet for trip ${assignment.tourName ?? ''}. Reason: ${dto.reason}`,
        });
        await this.audit.log({
            entityType: 'TourReport',
            entityId: updated.id,
            action: 'REJECT_MONEY',
            beforeData: { moneyRejectedAt: null },
            afterData: {
                moneyRejectedAt: updated.moneyRejectedAt,
                reason: dto.reason,
            },
            changedBy: actor.id,
        });
        this.gateway.notifyAll('board:refresh', {
            assignmentId,
            action: 'money_rejected',
        });
        return updated;
    }
    async watermarkFor(personId) {
        if (!personId)
            return null;
        const last = await this.prisma.paymentPeriod.findFirst({
            where: { personId, voidedAt: null },
            orderBy: { toDate: 'desc' },
            select: { toDate: true },
        });
        return last?.toDate ?? null;
    }
    async resolvePayee(payeeType, payeeId) {
        if (!payeeId) {
            if (payeeType)
                throw new common_1.BadRequestException('payeeId is required');
            return null;
        }
        if (payeeType === client_1.PayeeType.TRANSPORT_PROVIDER) {
            const p = await this.prisma.transportationProvider.findUnique({
                where: { id: payeeId },
                select: { id: true, name: true, isCompany: true },
            });
            if (!p)
                throw new common_1.NotFoundException('Transportation provider not found');
            if (p.isCompany) {
                throw new common_1.BadRequestException('This provider is the company fleet — use Company Driver instead');
            }
            return {
                id: p.id,
                kind: 'PROVIDER',
                name: p.name,
                email: null,
                role: client_1.RoleType.TRANSPORT_PROVIDER,
                userType: null,
                providerName: p.name,
                providerIsCompany: p.isCompany,
                payeeType: client_1.PayeeType.TRANSPORT_PROVIDER,
            };
        }
        const u = await this.prisma.user.findUnique({
            where: { id: payeeId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                userType: true,
                providerId: true,
                provider: { select: { id: true, name: true, isCompany: true } },
                guideProfile: { select: { type: true } },
                driverProfile: { select: { type: true } },
            },
        });
        if (!u)
            throw new common_1.NotFoundException('Person not found');
        if (!PAYABLE_ROLES.includes(u.role)) {
            throw new common_1.BadRequestException('Only tour guides and drivers can be paid out');
        }
        const derived = this.classifyPayee({
            role: u.role,
            providerId: u.providerId,
            providerIsCompany: u.provider?.isCompany,
            guideProfile: u.guideProfile,
            driverProfile: u.driverProfile,
        });
        if (payeeType && derived !== payeeType) {
            throw new common_1.BadRequestException(`${u.name ?? 'This person'} belongs to "${exports.PAYEE_LABELS[derived]}", not "${exports.PAYEE_LABELS[payeeType]}"`);
        }
        return {
            id: u.id,
            kind: 'PERSON',
            name: u.name ?? '—',
            email: u.email,
            role: u.role,
            userType: u.userType,
            providerName: u.provider?.name ?? null,
            providerIsCompany: u.provider?.isCompany ?? null,
            payeeType: derived,
        };
    }
    classifyPayee(u) {
        if (u.role === client_1.RoleType.TOUR_GUIDE) {
            return u.guideProfile?.type === client_1.GuideType.OFFICIAL
                ? client_1.PayeeType.COMPANY_GUIDE
                : client_1.PayeeType.FREELANCE;
        }
        if (u.role === client_1.RoleType.TRANSPORT_PROVIDER)
            return client_1.PayeeType.TRANSPORT_PROVIDER;
        if (u.providerId && u.providerIsCompany === false) {
            return client_1.PayeeType.TRANSPORT_PROVIDER;
        }
        if (u.role === client_1.RoleType.DRIVER) {
            return u.driverProfile?.type === client_1.DriverType.FREELANCE
                ? client_1.PayeeType.FREELANCE
                : client_1.PayeeType.COMPANY_DRIVER;
        }
        return client_1.PayeeType.FREELANCE;
    }
    async people(actor, query) {
        this.assertAccounting(actor);
        const roles = query.role ? [query.role] : PAYABLE_ROLES;
        const users = await this.prisma.user.findMany({
            where: { role: { in: roles }, isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                userType: true,
                providerId: true,
                provider: { select: { id: true, name: true, isCompany: true } },
                guideProfile: { select: { type: true } },
                driverProfile: { select: { type: true } },
            },
            orderBy: { name: 'asc' },
        });
        const staffOnly = users.filter((u) => !(u.role === client_1.RoleType.DRIVER &&
            u.providerId &&
            u.provider?.isCompany === false));
        const payees = staffOnly.map((u) => ({
            id: u.id,
            kind: 'PERSON',
            name: u.name ?? '—',
            email: u.email,
            role: u.role,
            userType: u.userType,
            providerName: u.provider?.name ?? null,
            providerIsCompany: u.provider?.isCompany ?? null,
            payeeType: this.classifyPayee({
                role: u.role,
                providerId: u.providerId,
                providerIsCompany: u.provider?.isCompany,
                guideProfile: u.guideProfile,
                driverProfile: u.driverProfile,
            }),
        }));
        const providers = await this.prisma.transportationProvider.findMany({
            where: { isCompany: false },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
        for (const p of providers) {
            payees.push({
                id: p.id,
                kind: 'PROVIDER',
                name: p.name,
                email: null,
                role: client_1.RoleType.TRANSPORT_PROVIDER,
                userType: null,
                providerName: p.name,
                providerIsCompany: false,
                payeeType: client_1.PayeeType.TRANSPORT_PROVIDER,
            });
        }
        const withWatermark = await Promise.all(payees.map(async (p) => ({
            ...p,
            paidThrough: await this.watermarkFor(p.id),
        })));
        const groups = Object.keys(exports.PAYEE_LABELS).map((t) => ({
            payeeType: t,
            label: exports.PAYEE_LABELS[t],
            payees: withWatermark.filter((p) => p.payeeType === t),
        }));
        return { groups, payees: withWatermark };
    }
    async periodPreview(actor, query) {
        this.assertAccounting(actor);
        const { from, to } = this.range(query.fromDate, query.toDate);
        const payee = await this.resolvePayee(query.payeeType, query.payeeId ?? query.personId);
        const exportedAssignments = payee
            ? (await this.prisma.paymentPeriodLine.findMany({
                where: {
                    period: { voidedAt: null },
                    ...(payee.kind === 'PROVIDER'
                        ? { assignment: { providerId: payee.id } }
                        : { payableToId: payee.id }),
                },
                select: { assignmentId: true },
            })).map((l) => l.assignmentId)
            : [];
        const isProvider = payee?.kind === 'PROVIDER';
        const closedInRange = {
            finalizedAt: { gte: from, lte: to },
        };
        const verifiedInRange = {
            ...closedInRange,
            moneyVerifiedAt: { not: null },
            ...(query.unpaidOnly ? { netAmount: { not: null } } : {}),
        };
        const where = {
            status: client_1.AssignmentStatus.COMPLETED,
            tourReport: { is: isProvider ? closedInRange : verifiedInRange },
        };
        if (payee) {
            if (isProvider) {
                where.providerId = payee.id;
            }
            else {
                where.tourReport = {
                    is: { ...verifiedInRange, moneyPayableToId: payee.id },
                };
            }
        }
        const assignments = await this.prisma.assignment.findMany({
            where,
            include: {
                tourReport: true,
                guide: { select: { id: true, name: true, providerId: true } },
                driver: { select: { id: true, name: true, providerId: true } },
                provider: { select: { id: true, name: true, isCompany: true } },
                vehicle: { select: { id: true, plateNumber: true } },
                bookings: { select: { tourId: true }, take: 1 },
            },
            orderBy: { tourReport: { finalizedAt: 'asc' } },
        });
        const routePrices = isProvider
            ? await this.prisma.routePrice.findMany({
                where: { providerId: payee.id },
                select: { tourId: true, vehicleId: true, price: true },
            })
            : [];
        const priceByKey = new Map(routePrices.map((r) => [`${r.tourId}|${r.vehicleId}`, num(r.price)]));
        const lines = assignments
            .filter((a) => !exportedAssignments.includes(a.id))
            .map((a) => {
            if (isProvider) {
                const tourId = a.bookings?.[0]?.tourId ?? null;
                const fromTable = tourId
                    ? priceByKey.get(`${tourId}|${a.vehicleId ?? ''}`)
                    : undefined;
                const hasOverride = a.priceOverride !== null && a.priceOverride !== undefined;
                const price = hasOverride ? num(a.priceOverride) : (fromTable ?? 0);
                return {
                    assignmentId: a.id,
                    code: a.code,
                    tourName: a.tourName,
                    plateNumber: a.vehicle?.plateNumber ?? null,
                    driver: a.driver,
                    provider: a.provider,
                    tourDate: a.tourReport?.finalizedAt ?? null,
                    amount: price,
                    basis: 'ROUTE_PRICE',
                    priceMissing: !hasOverride && fromTable === undefined,
                    direction: 'COMPANY_TO_PROVIDER',
                };
            }
            const net = num(a.tourReport?.netAmount);
            const flow = a.tourReport?.settlementFlow ?? client_1.FeeFlowType.COLLECT_MONEY;
            return {
                assignmentId: a.id,
                code: a.code,
                tourName: a.tourName,
                plateNumber: a.vehicle?.plateNumber ?? null,
                guide: a.guide,
                driver: a.driver,
                provider: a.provider,
                tourDate: a.tourReport?.finalizedAt ?? null,
                verifiedAt: a.tourReport?.moneyVerifiedAt ?? null,
                amount: net,
                basis: 'NET_SETTLEMENT',
                netAmount: net,
                flow,
                direction: flow === client_1.FeeFlowType.PAY_MONEY
                    ? 'COMPANY_TO_PERSON'
                    : 'PERSON_TO_COMPANY',
            };
        });
        if (isProvider) {
            const totalPrice = round2(lines.reduce((sum, l) => sum + l.amount, 0));
            return {
                mode: 'ROUTE_PRICE',
                fromDate: from,
                toDate: to,
                person: payee,
                paidThrough: payee ? await this.watermarkFor(payee.id) : null,
                lines,
                tourCount: lines.length,
                totalPrice,
                companyReturnsToProvider: totalPrice,
                direction: 'COMPANY_TO_PROVIDER',
            };
        }
        let personReturnsToCompany = 0;
        let companyReturnsToPerson = 0;
        for (const l of lines) {
            if (l.flow === client_1.FeeFlowType.PAY_MONEY)
                companyReturnsToPerson += Math.abs(l.amount);
            else
                personReturnsToCompany += l.amount;
        }
        const totalNet = round2(personReturnsToCompany - companyReturnsToPerson);
        return {
            mode: 'SETTLEMENT',
            fromDate: from,
            toDate: to,
            person: payee,
            paidThrough: payee ? await this.watermarkFor(payee.id) : null,
            lines,
            tourCount: lines.length,
            personReturnsToCompany: round2(personReturnsToCompany),
            companyReturnsToPerson: round2(companyReturnsToPerson),
            totalNet,
            direction: totalNet > 0
                ? 'PERSON_TO_COMPANY'
                : totalNet < 0
                    ? 'COMPANY_TO_PERSON'
                    : 'SETTLED',
        };
    }
    async exportPeriod(actor, dto) {
        this.assertAccounting(actor, 'accounting.period.export');
        const payee = await this.resolvePayee(dto.payeeType, dto.payeeId);
        if (!payee)
            throw new common_1.BadRequestException('payeeId is required');
        const preview = await this.periodPreview(actor, {
            fromDate: dto.fromDate,
            toDate: dto.toDate,
            payeeType: payee.payeeType,
            payeeId: payee.id,
        });
        if (preview.tourCount === 0) {
            throw new common_1.ConflictException(payee.kind === 'PROVIDER'
                ? 'No completed trips for this provider in this range — nothing to pay'
                : 'No unexported verified tours in this range — nothing to pay out');
        }
        if (payee.kind === 'PROVIDER' && preview.lines.some((l) => !l.driver)) {
            throw new common_1.ConflictException('Some tours in this range have no driver on the assignment, so the ' +
                'provider statement cannot be itemised. Assign a driver first.');
        }
        if (preview.mode === 'ROUTE_PRICE') {
            const missing = preview.lines.filter((l) => l.priceMissing);
            if (missing.length) {
                throw new common_1.ConflictException(`No price in the tour price table for ${missing.length} trip(s) ` +
                    `(e.g. ${missing[0].tourName ?? missing[0].code}). Set a price ` +
                    'for the provider + vehicle, or override the trip price, before exporting.');
            }
        }
        const watermark = await this.watermarkFor(payee.id);
        const from = new Date(dto.fromDate);
        if (watermark && from <= watermark) {
            throw new common_1.ConflictException('This range starts on or before the last exported period — exporting it risks paying twice. Pick a later start date.');
        }
        const period = await this.prisma.$transaction(async (tx) => {
            const created = await tx.paymentPeriod.create({
                data: {
                    personId: payee.id,
                    payeeType: payee.payeeType,
                    payeeName: payee.name,
                    fromDate: from,
                    toDate: preview.toDate,
                    tourCount: preview.tourCount,
                    personReturnsToCompany: new client_1.Prisma.Decimal(preview.mode === 'ROUTE_PRICE' ? 0 : preview.personReturnsToCompany),
                    companyReturnsToPerson: new client_1.Prisma.Decimal(preview.mode === 'ROUTE_PRICE'
                        ? preview.companyReturnsToProvider
                        : preview.companyReturnsToPerson),
                    totalNet: new client_1.Prisma.Decimal(preview.mode === 'ROUTE_PRICE'
                        ? -preview.totalPrice
                        : preview.totalNet),
                    note: dto.note ?? null,
                    createdById: actor.id,
                    createdByName: actor.name ?? null,
                    lines: {
                        create: preview.lines
                            .map((l) => ({
                            assignmentId: l.assignmentId,
                            payableToId: payee.kind === 'PROVIDER' ? l.driver.id : payee.id,
                            tourName: l.tourName,
                            tourDate: l.tourDate ?? preview.toDate,
                            netAmount: new client_1.Prisma.Decimal(l.amount),
                            flow: l.basis === 'ROUTE_PRICE' ? client_1.FeeFlowType.PAY_MONEY : l.flow,
                            note: [
                                l.code ?? 'tour',
                                l.plateNumber ?? '',
                                payee.kind === 'PROVIDER' ? (l.driver?.name ?? '') : '',
                            ]
                                .filter(Boolean)
                                .join(' · '),
                        })),
                    },
                },
                include: { lines: true },
            });
            await this.audit.log({
                entityType: 'PaymentPeriod',
                entityId: created.id,
                action: 'EXPORT',
                afterData: {
                    personId: payee.id,
                    personName: payee.name,
                    payeeType: payee.payeeType,
                    fromDate: dto.fromDate,
                    toDate: preview.toDate,
                    tourCount: created.tourCount,
                    total: preview.mode === 'ROUTE_PRICE'
                        ? preview.totalPrice
                        : preview.totalNet,
                },
                changedBy: actor.id,
            });
            return created;
        });
        return {
            periodId: period.id,
            ...preview,
            person: payee,
            note: dto.note ?? null,
        };
    }
    async voidPeriod(actor, periodId, dto) {
        this.assertAccounting(actor, 'accounting.period.void');
        const period = await this.prisma.paymentPeriod.findUnique({
            where: { id: periodId },
            include: { _count: { select: { lines: true } } },
        });
        if (!period)
            throw new common_1.NotFoundException('Payment period not found');
        if (period.voidedAt) {
            throw new common_1.ConflictException('This period was already voided');
        }
        const voided = await this.prisma.paymentPeriod.update({
            where: { id: periodId },
            data: {
                voidedAt: new Date(),
                voidedById: actor.id,
                voidedByName: actor.name ?? null,
                voidReason: dto.reason,
            },
        });
        await this.audit.log({
            entityType: 'PaymentPeriod',
            entityId: voided.id,
            action: 'VOID_PERIOD',
            beforeData: {
                fromDate: period.fromDate,
                toDate: period.toDate,
                payeeName: period.payeeName,
                payeeType: period.payeeType,
                tourCount: period.tourCount,
                totalNet: period.totalNet.toString(),
                lineCount: period._count.lines,
            },
            afterData: {
                voidedAt: voided.voidedAt,
                voidedBy: actor.email,
                reason: dto.reason,
            },
            changedBy: actor.id,
        });
        return voided;
    }
    async periodHistory(actor, personId) {
        this.assertAccounting(actor);
        const periods = await this.prisma.paymentPeriod.findMany({
            where: personId ? { personId } : {},
            include: {
                lines: { orderBy: { tourDate: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        const payeeIds = [...new Set(periods.map((p) => p.personId))];
        const [users, providers] = await Promise.all([
            this.prisma.user.findMany({
                where: { id: { in: payeeIds } },
                select: { id: true, name: true, role: true },
            }),
            this.prisma.transportationProvider.findMany({
                where: { id: { in: payeeIds } },
                select: { id: true, name: true },
            }),
        ]);
        const byId = new Map([
            ...users.map((u) => [u.id, { id: u.id, name: u.name ?? '—', role: u.role }]),
            ...providers.map((pr) => [
                pr.id,
                { id: pr.id, name: pr.name, role: 'TRANSPORT_PROVIDER' },
            ]),
        ]);
        return periods.map((p) => ({
            id: p.id,
            person: byId.get(p.personId) ?? {
                id: p.personId,
                name: p.payeeName ?? '—',
                role: null,
            },
            payeeType: p.payeeType,
            voidedAt: p.voidedAt,
            voidedByName: p.voidedByName,
            voidReason: p.voidReason,
            fromDate: p.fromDate,
            toDate: p.toDate,
            tourCount: p.tourCount,
            personReturnsToCompany: num(p.personReturnsToCompany),
            companyReturnsToPerson: num(p.companyReturnsToPerson),
            totalNet: num(p.totalNet),
            direction: num(p.totalNet) > 0
                ? 'PERSON_TO_COMPANY'
                : num(p.totalNet) < 0
                    ? 'COMPANY_TO_PERSON'
                    : 'SETTLED',
            note: p.note,
            createdByName: p.createdByName,
            createdAt: p.createdAt,
            lines: p.lines.map((l) => ({
                assignmentId: l.assignmentId,
                tourName: l.tourName,
                tourDate: l.tourDate,
                netAmount: num(l.netAmount),
                flow: l.flow,
                note: l.note,
            })),
        }));
    }
    async watermarkOverview(actor) {
        this.assertAccounting(actor);
        const periods = await this.prisma.paymentPeriod.findMany({
            orderBy: { toDate: 'desc' },
            select: { personId: true, toDate: true },
        });
        const map = new Map();
        for (const p of periods) {
            if (!map.has(p.personId))
                map.set(p.personId, p.toDate);
        }
        return [...map.entries()].map(([personId, toDate]) => ({
            personId,
            toDate,
        }));
    }
    async unverifiedReportCount(actor) {
        this.assertAccounting(actor);
        return this.prisma.tourReport.count({
            where: {
                finalizedAt: { not: null },
                moneyVerifiedAt: null,
                status: { in: [client_1.TourReportStatus.VERIFIED, client_1.TourReportStatus.SUBMITTED] },
            },
        });
    }
};
exports.AccountingService = AccountingService;
exports.AccountingService = AccountingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway])
], AccountingService);
//# sourceMappingURL=accounting.service.js.map
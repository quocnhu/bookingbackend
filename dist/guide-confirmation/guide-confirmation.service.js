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
var GuideConfirmationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuideConfirmationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const mail_service_1 = require("../mail/mail.service");
const transport_alert_template_1 = require("../mail/transport-alert.template");
const notification_service_1 = require("../notifications/notification.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const query_guide_confirmation_dto_1 = require("./dto/query-guide-confirmation.dto");
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
let GuideConfirmationService = GuideConfirmationService_1 = class GuideConfirmationService {
    prisma;
    audit;
    mail;
    notificationService;
    gateway;
    logger = new common_1.Logger(GuideConfirmationService_1.name);
    constructor(prisma, audit, mail, notificationService, gateway) {
        this.prisma = prisma;
        this.audit = audit;
        this.mail = mail;
        this.notificationService = notificationService;
        this.gateway = gateway;
    }
    async list(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            guideId: { not: null },
            executionMode: { not: client_1.AssignmentExecutionMode.OUTSOURCED_PARTNER },
            status: {
                in: [
                    client_1.AssignmentStatus.DRAFT_ASSIGNED,
                    client_1.AssignmentStatus.PENDING,
                    client_1.AssignmentStatus.TRANSFERRED,
                    client_1.AssignmentStatus.DISPATCHED,
                ],
            },
        };
        if (query.guideType) {
            where.guide = { guideProfile: { is: { type: query.guideType } } };
        }
        if (query.status === query_guide_confirmation_dto_1.GuideConfirmationStatus.AWAITING) {
            where.guideConfirmedAt = null;
            where.guideDeclinedAt = null;
        }
        else if (query.status === query_guide_confirmation_dto_1.GuideConfirmationStatus.CONFIRMED) {
            where.guideConfirmedAt = { not: null };
        }
        else if (query.status === query_guide_confirmation_dto_1.GuideConfirmationStatus.DECLINED) {
            where.guideDeclinedAt = { not: null };
        }
        if (query.from || query.to) {
            where.startDate = {};
            if (query.from)
                where.startDate.gte = new Date(`${query.from}T00:00:00+07:00`);
            if (query.to)
                where.startDate.lte = new Date(`${query.to}T23:59:59.999+07:00`);
        }
        if (query.search?.trim()) {
            const q = query.search.trim();
            where.OR = [
                { code: { contains: q, mode: 'insensitive' } },
                { tourName: { contains: q, mode: 'insensitive' } },
                { guide: { name: { contains: q, mode: 'insensitive' } } },
                { guide: { email: { contains: q, mode: 'insensitive' } } },
                { driver: { name: { contains: q, mode: 'insensitive' } } },
                { provider: { name: { contains: q, mode: 'insensitive' } } },
            ];
        }
        const [total, items] = await this.prisma.$transaction([
            this.prisma.assignment.count({ where }),
            this.prisma.assignment.findMany({
                where,
                orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    guide: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            guideProfile: { select: { type: true } },
                        },
                    },
                    driver: { select: { id: true, name: true } },
                    provider: { select: { id: true, name: true, isCompany: true } },
                    vehicle: { select: { id: true, plateNumber: true } },
                },
            }),
        ]);
        return {
            items: items.map((a) => {
                const status = a.guideDeclinedAt
                    ? query_guide_confirmation_dto_1.GuideConfirmationStatus.DECLINED
                    : a.guideConfirmedAt
                        ? query_guide_confirmation_dto_1.GuideConfirmationStatus.CONFIRMED
                        : query_guide_confirmation_dto_1.GuideConfirmationStatus.AWAITING;
                return {
                    id: a.id,
                    code: a.code,
                    tourName: a.tourName,
                    startDate: a.startDate,
                    endDate: a.endDate,
                    totalPax: a.totalPax,
                    status: a.status,
                    guide: a.guide,
                    driver: a.driver,
                    provider: a.provider,
                    vehicle: a.vehicle,
                    confirmationStatus: status,
                    guideConfirmationRequestedAt: a.guideConfirmationRequestedAt,
                    guideConfirmationEmailSentAt: a.guideConfirmationEmailSentAt,
                    guideConfirmedAt: a.guideConfirmedAt,
                    guideDeclinedAt: a.guideDeclinedAt,
                    guideDeclineReason: a.guideDeclineReason,
                };
            }),
            total,
            page,
            limit,
        };
    }
    async request(assignmentId, options) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: {
                guide: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        guideProfile: { select: { type: true } },
                    },
                },
                vehicle: { select: { plateNumber: true } },
                provider: { select: { name: true, isCompany: true } },
            },
        });
        if (!assignment)
            return { requested: false, reason: 'NOT_FOUND' };
        if (!assignment.guide?.id)
            return { requested: false, reason: 'NO_GUIDE' };
        if (assignment.executionMode === client_1.AssignmentExecutionMode.OUTSOURCED_PARTNER) {
            return { requested: false, reason: 'OUTSOURCED' };
        }
        if (assignment.status === client_1.AssignmentStatus.COMPLETED ||
            assignment.status === client_1.AssignmentStatus.CANCELED) {
            return { requested: false, reason: 'FINISHED' };
        }
        if (options?.reminder && (assignment.guideConfirmedAt || assignment.guideDeclinedAt)) {
            return { requested: false, reason: 'ALREADY_RESPONDED' };
        }
        const requestedAt = new Date();
        const companyGuide = assignment.guide.guideProfile?.type === client_1.GuideType.OFFICIAL;
        await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                guideConfirmationRequestedAt: requestedAt,
                guideConfirmedAt: companyGuide
                    ? requestedAt
                    : options?.reminder
                        ? undefined
                        : null,
                guideDeclinedAt: options?.reminder ? undefined : null,
                guideDeclineReason: options?.reminder ? undefined : null,
            },
        });
        const title = companyGuide
            ? 'New tour assignment'
            : options?.reminder
                ? 'Reminder: please confirm your tour assignment'
                : 'New tour assignment — please confirm';
        const when = this.formatWhen(assignment.startDate);
        const details = [
            assignment.tourName ?? assignment.code ?? 'Tour',
            when,
            assignment.vehicle?.plateNumber
                ? `Vehicle ${assignment.vehicle.plateNumber}`
                : null,
            assignment.provider?.name ? `Provider ${assignment.provider.name}` : null,
        ]
            .filter(Boolean)
            .join(' · ');
        const body = companyGuide
            ? `${details}. Your assignment is confirmed. Open My Trips for details.`
            : `${details}. Open My Trips to confirm, or mark yourself unavailable so the operator can reassign.`;
        const notification = await this.notificationService.create(assignment.guide.id, client_1.NotificationType.GENERAL, title, body, {
            kind: 'GUIDE_CONFIRMATION_REQUEST',
            assignmentId: assignment.id,
            url: '/tour-guide/my-trips',
        });
        this.gateway.notifyUser(assignment.guide.id, 'notification', notification);
        let emailed = false;
        const to = (assignment.guide.email ?? '').trim();
        if (EMAIL_RE.test(to)) {
            const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
            const result = await this.mail.sendTransportAlert({
                to: [to],
                title,
                message: `${body}\n\n${details}`,
                note: companyGuide ? transport_alert_template_1.MAIL_LOGIN_DETAIL_NOTE : transport_alert_template_1.MAIL_LOGIN_CONFIRM_NOTE,
                reference: assignment.code ?? assignment.id,
                actionLabel: 'Open my trips',
                actionUrl: `${frontend}/tour-guide/my-trips`,
            });
            emailed = result.sent > 0;
            if (emailed) {
                await this.prisma.assignment.update({
                    where: { id: assignment.id },
                    data: { guideConfirmationEmailSentAt: new Date() },
                });
            }
        }
        else {
            this.logger.warn(`Guide ${assignment.guide.id} has no valid email for ${assignment.code ?? assignment.id}`);
        }
        await this.audit.log({
            entityType: 'Assignment',
            entityId: assignment.id,
            action: options?.reminder
                ? 'GUIDE_CONFIRMATION_REMIND'
                : 'GUIDE_CONFIRMATION_REQUEST',
            afterData: {
                guideId: assignment.guide.id,
                requestedAt,
                emailed,
                autoConfirmed: companyGuide,
            },
            changedBy: options?.actorId ?? null,
        });
        this.gateway.notifyAll('board:refresh', {
            assignmentId: assignment.id,
            action: 'guide_confirmation_requested',
        });
        return { requested: true, emailed, autoConfirmed: companyGuide };
    }
    async ensureCompanyGuideConfirmed(assignmentId) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            select: {
                id: true,
                guideConfirmedAt: true,
                guideDeclinedAt: true,
                guideConfirmationRequestedAt: true,
                guide: {
                    select: { guideProfile: { select: { type: true } } },
                },
            },
        });
        if (!assignment?.guide)
            return false;
        if (assignment.guide.guideProfile?.type !== client_1.GuideType.OFFICIAL) {
            return false;
        }
        if (assignment.guideConfirmedAt || assignment.guideDeclinedAt)
            return false;
        const now = new Date();
        await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                guideConfirmationRequestedAt: assignment.guideConfirmationRequestedAt ?? now,
                guideConfirmedAt: now,
            },
        });
        await this.audit.log({
            entityType: 'Assignment',
            entityId: assignment.id,
            action: 'GUIDE_CONFIRMATION_AUTO_CONFIRM',
            afterData: { autoConfirmed: true },
            changedBy: null,
        });
        return true;
    }
    async confirm(assignmentId, actor) {
        const assignment = await this.loadAssignment(assignmentId);
        this.assertCanRespond(assignment, actor);
        if (!assignment.guideId) {
            throw new common_1.BadRequestException('This trip has no tour guide assigned');
        }
        const confirmedAt = new Date();
        await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                guideConfirmedAt: confirmedAt,
                guideDeclinedAt: null,
                guideDeclineReason: null,
            },
        });
        await this.audit.log({
            entityType: 'Assignment',
            entityId: assignment.id,
            action: 'GUIDE_CONFIRMATION_CONFIRM',
            afterData: { guideId: assignment.guideId, confirmedAt },
            changedBy: actor.id,
        });
        const byAdmin = this.isAdminOrOffice(actor);
        if (!byAdmin) {
            await this.notifyAdmins('Tour guide confirmed', `${assignment.guide?.name ?? 'The guide'} confirmed ${assignment.tourName ?? assignment.code ?? 'the trip'} on ${this.formatWhen(assignment.startDate)}.`, assignment.id);
        }
        else {
            await this.notifyGuide(assignment.guideId, 'Assignment confirmed by the operator', `The operator confirmed your assignment for ${assignment.tourName ?? assignment.code ?? 'the trip'} on ${this.formatWhen(assignment.startDate)}.`, assignment.id);
        }
        this.gateway.notifyAll('board:refresh', {
            assignmentId: assignment.id,
            action: 'guide_confirmed',
        });
        return { confirmedAt };
    }
    async decline(assignmentId, actor, reason) {
        const assignment = await this.loadAssignment(assignmentId);
        this.assertCanRespond(assignment, actor);
        if (!assignment.guideId) {
            throw new common_1.BadRequestException('This trip has no tour guide assigned');
        }
        const declinedAt = new Date();
        const note = (reason ?? '').trim().slice(0, 1000) || null;
        await this.prisma.assignment.update({
            where: { id: assignment.id },
            data: {
                guideDeclinedAt: declinedAt,
                guideDeclineReason: note,
                guideConfirmedAt: null,
            },
        });
        await this.audit.log({
            entityType: 'Assignment',
            entityId: assignment.id,
            action: 'GUIDE_CONFIRMATION_DECLINE',
            afterData: { guideId: assignment.guideId, declinedAt, reason: note },
            changedBy: actor.id,
        });
        await this.notifyAdmins('Tour guide unavailable', `${assignment.guide?.name ?? 'The guide'} declined ${assignment.tourName ?? assignment.code ?? 'the trip'} on ${this.formatWhen(assignment.startDate)}${note ? ` — ${note}` : ''}. Reassign a guide before dispatching.`, assignment.id);
        this.gateway.notifyAll('board:refresh', {
            assignmentId: assignment.id,
            action: 'guide_declined',
        });
        return { declinedAt };
    }
    async reset(assignmentId) {
        await this.prisma.assignment.updateMany({
            where: { id: assignmentId },
            data: {
                guideConfirmationRequestedAt: null,
                guideConfirmationEmailSentAt: null,
                guideConfirmedAt: null,
                guideDeclinedAt: null,
                guideDeclineReason: null,
            },
        });
    }
    async loadAssignment(assignmentId) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: {
                guide: { select: { id: true, name: true, email: true } },
            },
        });
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        return assignment;
    }
    assertCanRespond(assignment, actor) {
        if (this.isAdminOrOffice(actor))
            return;
        if (actor.id !== assignment.guideId) {
            throw new common_1.ForbiddenException('Only the assigned tour guide can update this confirmation');
        }
    }
    isAdminOrOffice(actor) {
        return actor.role === client_1.RoleType.ADMIN || actor.role === client_1.RoleType.OFFICE;
    }
    async notifyAdmins(title, body, assignmentId) {
        const users = await this.prisma.user.findMany({
            where: { role: { in: [client_1.RoleType.ADMIN, client_1.RoleType.OFFICE] }, isActive: true },
            select: { id: true },
        });
        for (const user of users) {
            const notification = await this.notificationService.create(user.id, client_1.NotificationType.GENERAL, title, body, {
                kind: 'GUIDE_CONFIRMATION_UPDATE',
                assignmentId,
                url: '/bookings?tab=assignments',
            });
            this.gateway.notifyUser(user.id, 'notification', notification);
        }
    }
    async notifyGuide(guideId, title, body, assignmentId) {
        const notification = await this.notificationService.create(guideId, client_1.NotificationType.GENERAL, title, body, {
            kind: 'GUIDE_CONFIRMATION_UPDATE',
            assignmentId,
            url: '/tour-guide/my-trips',
        });
        this.gateway.notifyUser(guideId, 'notification', notification);
    }
    formatWhen(value) {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Ho_Chi_Minh',
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));
    }
};
exports.GuideConfirmationService = GuideConfirmationService;
exports.GuideConfirmationService = GuideConfirmationService = GuideConfirmationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        mail_service_1.MailService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway])
], GuideConfirmationService);
//# sourceMappingURL=guide-confirmation.service.js.map
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
exports.LeavesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("@/prisma/prisma.service");
const audit_service_1 = require("@/audit/audit.service");
const notification_service_1 = require("@/notifications/notification.service");
const notifications_gateway_1 = require("@/notifications/notifications.gateway");
const client_1 = require("@prisma/client");
const LEAVE_BLOCKING_STATUSES = [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.APPROVED];
let LeavesService = class LeavesService {
    prisma;
    auditService;
    notificationService;
    gateway;
    constructor(prisma, auditService, notificationService, gateway) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.gateway = gateway;
    }
    includeUser = {
        user: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true, email: true, role: true } },
    };
    normalizeRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new common_1.BadRequestException('Invalid leave dates');
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        if (start > end) {
            throw new common_1.BadRequestException('startDate must be before or equal endDate');
        }
        return { start, end };
    }
    async hasLeaveConflict(userId, start, end, excludeId) {
        const count = await this.prisma.userLeave.count({
            where: {
                userId,
                status: { in: LEAVE_BLOCKING_STATUSES },
                startDate: { lte: end },
                endDate: { gte: start },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }
    async create(dto, actor) {
        const { start, end } = this.normalizeRange(dto.startDate, dto.endDate);
        const isStaff = actor.role === client_1.RoleType.ADMIN || actor.role === client_1.RoleType.OFFICE;
        let targetUserId = actor.id;
        if (dto.userId) {
            if (!isStaff) {
                throw new common_1.ForbiddenException('Only ADMIN/OFFICE can create leaves for others');
            }
            const target = await this.prisma.user.findUnique({
                where: { id: dto.userId },
                select: { id: true, isActive: true },
            });
            if (!target)
                throw new common_1.NotFoundException('Staff member not found');
            if (!target.isActive) {
                throw new common_1.BadRequestException('Cannot create a leave for an inactive staff member');
            }
            targetUserId = target.id;
        }
        if (await this.hasLeaveConflict(targetUserId, start, end)) {
            throw new common_1.BadRequestException('This staff member already has a pending or approved leave covering this date range');
        }
        const leave = await this.prisma.userLeave.create({
            data: {
                userId: targetUserId,
                startDate: start,
                endDate: end,
                reason: dto.reason,
                status: client_1.LeaveStatus.PENDING,
            },
            include: this.includeUser,
        });
        if (targetUserId === actor.id) {
            await this.notifyAdminsOfRequest(leave);
        }
        await this.auditService.log({
            entityType: 'UserLeave',
            entityId: leave.id,
            action: 'CREATE',
            afterData: { startDate: leave.startDate, endDate: leave.endDate },
            changedBy: actor.id,
        });
        return leave;
    }
    async findAll(query, actor) {
        const { page, limit, status, userId, search, reason, reviewedBy, from, to, createdFrom, createdTo, } = query;
        const isStaff = actor.role === client_1.RoleType.ADMIN || actor.role === client_1.RoleType.OFFICE;
        const where = {};
        if (!isStaff) {
            where.userId = actor.id;
        }
        else if (userId) {
            where.userId = userId;
        }
        if (status)
            where.status = status;
        if (search) {
            where.user = { name: { contains: search, mode: 'insensitive' } };
        }
        if (reason) {
            where.reason = { contains: reason, mode: 'insensitive' };
        }
        if (reviewedBy) {
            where.reviewedBy = { name: { contains: reviewedBy, mode: 'insensitive' } };
        }
        if (from) {
            where.endDate = { gte: new Date(`${from}T00:00:00.000Z`) };
        }
        if (to) {
            where.startDate = { lte: new Date(`${to}T23:59:59.999Z`) };
        }
        if (createdFrom || createdTo) {
            where.createdAt = {
                ...(createdFrom ? { gte: new Date(`${createdFrom}T00:00:00.000Z`) } : {}),
                ...(createdTo ? { lte: new Date(`${createdTo}T23:59:59.999Z`) } : {}),
            };
        }
        const [items, total] = await Promise.all([
            this.prisma.userLeave.findMany({
                where,
                include: this.includeUser,
                orderBy: [{ startDate: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.userLeave.count({ where }),
        ]);
        return {
            items: items.map((it) => this.flatten(it)),
            total,
            page,
            limit,
        };
    }
    async findMy(actor) {
        return this.prisma.userLeave.findMany({
            where: { userId: actor.id },
            include: this.includeUser,
            orderBy: [{ startDate: 'desc' }],
        });
    }
    async updateStatus(id, dto, actor) {
        if (actor.role !== client_1.RoleType.ADMIN && actor.role !== client_1.RoleType.OFFICE) {
            throw new common_1.ForbiddenException('Only ADMIN/OFFICE can approve or reject leave requests');
        }
        if (dto.status === client_1.LeaveStatus.PENDING) {
            throw new common_1.BadRequestException('Cannot set a request back to PENDING');
        }
        const leave = await this.prisma.userLeave.findUnique({
            where: { id },
            include: this.includeUser,
        });
        if (!leave)
            throw new common_1.NotFoundException('Leave request not found');
        if (leave.status !== client_1.LeaveStatus.PENDING) {
            throw new common_1.BadRequestException(`Leave is already ${leave.status}`);
        }
        const updated = await this.prisma.userLeave.update({
            where: { id },
            data: {
                status: dto.status,
                reviewedById: actor.id,
                reviewedAt: new Date(),
            },
            include: this.includeUser,
        });
        const approved = dto.status === client_1.LeaveStatus.APPROVED;
        const notif = await this.notificationService.create(leave.userId, approved ? client_1.NotificationType.LEAVE_APPROVED : client_1.NotificationType.LEAVE_REJECTED, approved ? '✅ Đơn nghỉ phép đã được duyệt' : '❌ Đơn nghỉ phép bị từ chối', `${this.formatRange(leave.startDate, leave.endDate)} — ${approved ? 'Đã duyệt' : 'Bị từ chối'} bởi ${actor.name ?? actor.email}.`, { leaveId: leave.id, status: dto.status, userId: leave.userId });
        this.gateway.notifyUser(leave.userId, 'notification', notif);
        await this.auditService.log({
            entityType: 'UserLeave',
            entityId: id,
            action: `UPDATE_STATUS:${dto.status}`,
            beforeData: { status: leave.status },
            afterData: { status: dto.status, approvedByName: actor.name },
            changedBy: actor.id,
        });
        return updated;
    }
    async remove(id, actor) {
        const leave = await this.prisma.userLeave.findUnique({ where: { id } });
        if (!leave)
            throw new common_1.NotFoundException('Leave request not found');
        const isStaff = actor.role === client_1.RoleType.ADMIN || actor.role === client_1.RoleType.OFFICE;
        const isOwner = leave.userId === actor.id;
        if (!isStaff && !isOwner) {
            throw new common_1.ForbiddenException('Cannot delete another user\'s leave request');
        }
        if (!isStaff && leave.status !== client_1.LeaveStatus.PENDING) {
            throw new common_1.BadRequestException('Only pending leave requests can be cancelled');
        }
        await this.prisma.userLeave.delete({ where: { id } });
        await this.auditService.log({
            entityType: 'UserLeave',
            entityId: id,
            action: 'DELETE',
            beforeData: { userId: leave.userId, status: leave.status },
            changedBy: actor.id,
        });
        return { message: 'Leave request deleted' };
    }
    formatRange(start, end) {
        const s = start.toISOString().slice(0, 10);
        const e = end.toISOString().slice(0, 10);
        return s === e ? s : `${s} → ${e}`;
    }
    flatten(it) {
        return {
            id: it.id,
            requesterName: it.user?.name ?? null,
            requesterRole: it.user?.role ?? null,
            startDate: it.startDate.toISOString(),
            endDate: it.endDate.toISOString(),
            reason: it.reason,
            status: it.status,
            reviewedByName: it.reviewedBy?.name ?? null,
            reviewedByRole: it.reviewedBy?.role ?? null,
            reviewedAt: it.reviewedAt ? it.reviewedAt.toISOString() : null,
            createdAt: it.createdAt.toISOString(),
            updatedAt: it.updatedAt ? it.updatedAt.toISOString() : null,
            userId: it.userId,
        };
    }
    async notifyAdminsOfRequest(leave) {
        const admins = await this.prisma.user.findMany({
            where: { role: client_1.RoleType.ADMIN, isActive: true },
            select: { id: true },
        });
        const requester = leave.user?.name ?? leave.user?.email ?? 'Nhân sự';
        const role = leave.user?.role === client_1.RoleType.DRIVER ? 'Tài xế' : 'Tour guide';
        const title = `📅 Yêu cầu nghỉ phép mới`;
        const body = `${requester} (${role}) đăng ký nghỉ: ${this.formatRange(leave.startDate, leave.endDate)}. Vào mục Leaves để duyệt.`;
        for (const admin of admins) {
            const notif = await this.notificationService.create(admin.id, client_1.NotificationType.LEAVE_REQUESTED, title, body, { leaveId: leave.id, userId: leave.userId });
            this.gateway.notifyUser(admin.id, 'notification', notif);
        }
    }
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import {
  CreateLeaveDto,
  QueryLeaveDto,
  UpdateLeaveStatusDto,
} from './dto/leave.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { LeaveStatus, NotificationType, RoleType } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

const LEAVE_BLOCKING_STATUSES = [LeaveStatus.PENDING, LeaveStatus.APPROVED];

@Injectable()
export class LeavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
  ) {}

  private includeUser = {
    user: { select: { id: true, name: true, email: true, role: true } },
    reviewedBy: { select: { id: true, name: true, email: true, role: true } },
  };

  /** Chuẩn hoá ngày nghỉ: start = 00:00:00, end = 23:59:59 → lấp trọn cả ngày. */
  private normalizeRange(startDate: string | Date, endDate: string | Date) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid leave dates');
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (start > end) {
      throw new BadRequestException('startDate must be before or equal endDate');
    }
    return { start, end };
  }

  /** Kiểm tra user có nghỉ phép (PENDING/APPROVED) trùng khoảng [start, end] hay không. */
  async hasLeaveConflict(userId: string, start: Date, end: Date, excludeId?: string) {
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

  /** User (guide/driver/...) tự đăng ký nghỉ 1 ngày hoặc 1 khoảng ngày. */
  async create(dto: CreateLeaveDto, actor: AuthenticatedUser) {
    const { start, end } = this.normalizeRange(dto.startDate, dto.endDate);

    const isStaff = actor.role === RoleType.ADMIN || actor.role === RoleType.OFFICE;
    let targetUserId = actor.id;
    if (dto.userId) {
      if (!isStaff) {
        throw new ForbiddenException(
          'Only ADMIN/OFFICE can create leaves for others',
        );
      }
      const target = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, isActive: true },
      });
      if (!target) throw new NotFoundException('Staff member not found');
      if (!target.isActive) {
        throw new BadRequestException(
          'Cannot create a leave for an inactive staff member',
        );
      }
      targetUserId = target.id;
    }

    if (await this.hasLeaveConflict(targetUserId, start, end)) {
      throw new BadRequestException(
        'This staff member already has a pending or approved leave covering this date range',
      );
    }

    const leave = await this.prisma.userLeave.create({
      data: {
        userId: targetUserId,
        startDate: start,
        endDate: end,
        reason: dto.reason,
        status: LeaveStatus.PENDING,
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

  /** Danh sách nghỉ phép: Admin/OFFICE xem tất cả, nhân sự chỉ xem của mình. */
  async findAll(query: QueryLeaveDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const {
      page,
      limit,
      status,
      userId,
      search,
      reason,
      reviewedBy,
      from,
      to,
      createdFrom,
      createdTo,
    } = query;
    const isStaff = actor.role === RoleType.ADMIN || actor.role === RoleType.OFFICE;
    const where: any = {};
    if (!isStaff) {
      where.userId = actor.id;
    } else if (userId) {
      where.userId = userId;
    }
    if (status) where.status = status;
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

  async findMy(actor: AuthenticatedUser) {
    return this.prisma.userLeave.findMany({
      where: { userId: actor.id },
      include: this.includeUser,
      orderBy: [{ startDate: 'desc' }],
    });
  }

  /** Admin/OFFICE duyệt hoặc từ chối đơn nghỉ phép. */
  async updateStatus(id: string, dto: UpdateLeaveStatusDto, actor: AuthenticatedUser) {
    if (actor.role !== RoleType.ADMIN && actor.role !== RoleType.OFFICE) {
      throw new ForbiddenException('Only ADMIN/OFFICE can approve or reject leave requests');
    }
    if (dto.status === LeaveStatus.PENDING) {
      throw new BadRequestException('Cannot set a request back to PENDING');
    }

    const leave = await this.prisma.userLeave.findUnique({
      where: { id },
      include: this.includeUser,
    });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Leave is already ${leave.status}`);
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

    const approved = dto.status === LeaveStatus.APPROVED;
    const notif = await this.notificationService.create(
      leave.userId,
      approved ? NotificationType.LEAVE_APPROVED : NotificationType.LEAVE_REJECTED,
      approved ? '✅ Đơn nghỉ phép đã được duyệt' : '❌ Đơn nghỉ phép bị từ chối',
      `${this.formatRange(leave.startDate, leave.endDate)} — ${approved ? 'Đã duyệt' : 'Bị từ chối'} bởi ${actor.name ?? actor.email}.`,
      { leaveId: leave.id, status: dto.status, userId: leave.userId },
    );
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

  /** Chủ sở hữu (đơn PENDING) hoặc Admin/OFFICE có thể xoá đơn. */
  async remove(id: string, actor: AuthenticatedUser) {
    const leave = await this.prisma.userLeave.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Leave request not found');

    const isStaff = actor.role === RoleType.ADMIN || actor.role === RoleType.OFFICE;
    const isOwner = leave.userId === actor.id;
    if (!isStaff && !isOwner) {
      throw new ForbiddenException('Cannot delete another user\'s leave request');
    }
    if (!isStaff && leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be cancelled');
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

  private formatRange(start: Date, end: Date) {
    const s = start.toISOString().slice(0, 10);
    const e = end.toISOString().slice(0, 10);
    return s === e ? s : `${s} → ${e}`;
  }

  /** Làm phẳng kết quả: đưa requesterName/requesterRole lên cùng cấp, chuyển ngày sang ISO. */
  private flatten(it: any) {
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

  /** Thông báo toàn bộ Admin trên hệ thống khi nhân sự đăng ký nghỉ phép. */
  private async notifyAdminsOfRequest(leave: {
    id: string;
    userId: string;
    startDate: Date;
    endDate: Date;
    user?: { name?: string | null; role?: RoleType } | null;
  }) {
    const admins = await this.prisma.user.findMany({
      where: { role: RoleType.ADMIN, isActive: true },
      select: { id: true },
    });
    const requester =
      (leave as any).user?.name ?? (leave as any).user?.email ?? 'Nhân sự';
    const role =
      (leave as any).user?.role === RoleType.DRIVER ? 'Tài xế' : 'Tour guide';
    const title = `📅 Yêu cầu nghỉ phép mới`;
    const body = `${requester} (${role}) đăng ký nghỉ: ${this.formatRange(leave.startDate, leave.endDate)}. Vào mục Leaves để duyệt.`;

    for (const admin of admins) {
      const notif = await this.notificationService.create(
        admin.id,
        NotificationType.LEAVE_REQUESTED,
        title,
        body,
        { leaveId: leave.id, userId: leave.userId },
      );
      this.gateway.notifyUser(admin.id, 'notification', notif);
    }
  }
}
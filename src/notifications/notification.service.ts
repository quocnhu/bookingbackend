import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { SendNotificationDto } from './dto/notification.dto';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  OFFICE: 'Office',
  TOUR_GUIDE: 'Tour Guide',
  DRIVER: 'Driver',
  TRANSPORT_PROVIDER: 'Transport Provider',
  CUSTOMER: 'Customer',
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(userId: string, type: NotificationType, title: string, body: string, data?: Record<string, any>) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, data: data ?? Prisma.JsonNull },
    });
    this.logger.log(`Notification [${type}] → ${userId}: ${title}`);
    return notification;
  }

  async findAll(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  async registerPush(userId: string, endpoint: string, userAgent?: string) {
    return this.prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint } },
      update: { active: true, userAgent },
      create: { userId, endpoint, userAgent },
    });
  }

  async removePush(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.updateMany({
      where: { userId, endpoint },
      data: { active: false },
    });
  }

  async getPushTokens(userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: { userId, active: true },
      select: { endpoint: true },
    });
  }

  /** Danh sách nhóm người nhận (role type) + người dùng để chọn trong UI gửi thông báo. */
  async getTargets(search?: string) {
    const groups = await this.prisma.user.groupBy({
      by: ['role'],
      where: { isActive: true },
      _count: { _all: true },
      orderBy: { _count: { role: 'desc' } },
    });

    const roleGroups = groups
      .filter((g) => g._count._all > 0)
      .map((g) => ({
        key: g.role,
        label: ROLE_LABELS[g.role] ?? g.role,
        count: g._count._all,
      }));

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: 'asc' }],
      take: 100,
    });

    return { roleGroups, users };
  }

  /** Gửi thông báo tới một nhóm role (tất cả user active) và/hoặc các user cụ thể. */
  async send(dto: SendNotificationDto, actor: AuthenticatedUser) {
    const recipientIds = new Set<string>(dto.userIds ?? []);

    if (dto.roleTypes?.length) {
      const byRole = await this.prisma.user.findMany({
        where: { isActive: true, role: { in: dto.roleTypes } },
        select: { id: true },
      });
      for (const u of byRole) recipientIds.add(u.id);
    }

    if (recipientIds.size === 0) {
      throw new BadRequestException('No recipients selected');
    }

    const type = dto.type ?? NotificationType.GENERAL;
    const created: any[] = [];
    for (const userId of recipientIds) {
      const notif = await this.create(userId, type, dto.title, dto.body, {
        fromUserId: actor.id,
      });
      this.gateway.notifyUser(userId, 'notification', notif);
      created.push(notif);
    }

    this.auditService.log({
      entityType: 'Notification',
      entityId: dto.title || 'notification',
      action: 'SEND',
      afterData: {
        recipients: recipientIds.size,
        roleTypes: dto.roleTypes ?? [],
        userIds: dto.userIds ?? [],
      },
      changedBy: actor.id,
    });

    return {
      sent: recipientIds.size,
      recipients: [...recipientIds],
    };
  }
}

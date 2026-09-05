import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}

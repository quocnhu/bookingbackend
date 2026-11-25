import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GuideHoldStatus,
  NotificationType,
  RoleType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import {
  CreateGuideHoldDto,
  QueryGuideHoldDto,
  UpdateGuideHoldDto,
} from './dto/guide-hold.dto';

/**
 * Manager-created reservations for tour guides. Unlike leave, a hold has no
 * approval flow and does not count as a day off; it simply blocks overlapping
 * assignments until it is released.
 */
@Injectable()
export class GuideHoldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
  ) {}

  private include = {
    guide: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true, email: true } },
    releasedBy: { select: { id: true, name: true, email: true } },
  };

  async mine(actor: AuthenticatedUser) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.guideHold.findMany({
      where: {
        guideId: actor.id,
        status: GuideHoldStatus.ACTIVE,
        endDate: { gte: today },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        note: true,
        status: true,
      },
      orderBy: { startDate: 'asc' },
      take: 50,
    });
  }

  async list(query: QueryGuideHoldDto) {
    const where: any = {};
    if (query.guideId) where.guideId = query.guideId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      if (query.from) {
        where.endDate = { gte: this.startOfDay(new Date(query.from)) };
      }
      if (query.to) {
        where.startDate = { lte: this.endOfDay(new Date(query.to)) };
      }
    }
    return this.prisma.guideHold.findMany({
      where,
      include: this.include,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async create(dto: CreateGuideHoldDto, actor: AuthenticatedUser) {
    const { start, end } = this.normalizeRange(dto.startDate, dto.endDate);
    const guide = await this.prisma.user.findUnique({
      where: { id: dto.guideId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
    if (!guide) throw new NotFoundException('Tour guide not found');
    if (guide.role !== RoleType.TOUR_GUIDE) {
      throw new BadRequestException('The selected user is not a tour guide');
    }
    if (!guide.isActive) {
      throw new BadRequestException('The selected tour guide is inactive');
    }
    await this.assertNoOverlap(guide.id, start, end);

    const hold = await this.prisma.guideHold.create({
      data: {
        guideId: guide.id,
        startDate: start,
        endDate: end,
        note: dto.note?.trim() || null,
        createdById: actor.id,
      },
      include: this.include,
    });
    await this.audit.log({
      entityType: 'GuideHold',
      entityId: hold.id,
      action: 'CREATE_GUIDE_HOLD',
      afterData: {
        guideId: hold.guideId,
        startDate: hold.startDate,
        endDate: hold.endDate,
        note: hold.note,
      },
      changedBy: actor.id,
    });
    await this.notifyGuide(
      hold.guideId,
      'Schedule hold',
      `${this.formatRange(hold.startDate, hold.endDate)} — ${hold.note || 'Reserved by the operator'}. You cannot be assigned to tours during these dates.`,
      { kind: 'GUIDE_HOLD', holdId: hold.id },
    );
    return hold;
  }

  async update(id: string, dto: UpdateGuideHoldDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.guideHold.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Guide hold not found');
    if (existing.status === GuideHoldStatus.RELEASED) {
      throw new BadRequestException('This hold has already been released');
    }
    const { start, end } = this.normalizeRange(
      dto.startDate ?? existing.startDate,
      dto.endDate ?? existing.endDate,
    );
    await this.assertNoOverlap(existing.guideId, start, end, existing.id);
    const hold = await this.prisma.guideHold.update({
      where: { id },
      data: {
        startDate: start,
        endDate: end,
        note: dto.note !== undefined ? dto.note?.trim() || null : undefined,
      },
      include: this.include,
    });
    await this.audit.log({
      entityType: 'GuideHold',
      entityId: id,
      action: 'UPDATE_GUIDE_HOLD',
      beforeData: existing,
      afterData: hold,
      changedBy: actor.id,
    });
    await this.notifyGuide(
      hold.guideId,
      'Schedule hold updated',
      `${this.formatRange(hold.startDate, hold.endDate)} — ${hold.note || 'Reserved by the operator'}.`,
      { kind: 'GUIDE_HOLD_UPDATED', holdId: hold.id },
    );
    return hold;
  }

  async release(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.guideHold.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Guide hold not found');
    if (existing.status === GuideHoldStatus.RELEASED) return existing;
    const hold = await this.prisma.guideHold.update({
      where: { id },
      data: {
        status: GuideHoldStatus.RELEASED,
        releasedAt: new Date(),
        releasedById: actor.id,
      },
      include: this.include,
    });
    await this.audit.log({
      entityType: 'GuideHold',
      entityId: id,
      action: 'RELEASE_GUIDE_HOLD',
      beforeData: existing,
      afterData: hold,
      changedBy: actor.id,
    });
    await this.notifyGuide(
      hold.guideId,
      'Schedule hold released',
      `${this.formatRange(hold.startDate, hold.endDate)} is no longer held. You can be assigned again.`,
      { kind: 'GUIDE_HOLD_RELEASED', holdId: hold.id },
    );
    return hold;
  }

  private async assertNoOverlap(
    guideId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ) {
    const overlap = await this.prisma.guideHold.findFirst({
      where: {
        guideId,
        status: GuideHoldStatus.ACTIVE,
        startDate: { lte: end },
        endDate: { gte: start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, startDate: true, endDate: true },
    });
    if (overlap) {
      throw new BadRequestException(
        `This guide already has an active hold from ${this.formatDate(overlap.startDate)} to ${this.formatDate(overlap.endDate)}.`,
      );
    }
  }

  private normalizeRange(startValue: string | Date, endValue: string | Date) {
    const start = this.startOfDay(new Date(startValue));
    const end = this.endOfDay(new Date(endValue));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid hold dates');
    }
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('End date must be on or after the start date');
    }
    return { start, end };
  }

  private startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-GB');
  }

  private formatRange(start: Date | string, end: Date | string) {
    return `${this.formatDate(start)} → ${this.formatDate(end)}`;
  }

  private async notifyGuide(
    guideId: string,
    title: string,
    body: string,
    data: Record<string, unknown>,
  ) {
    const notification = await this.notificationService.create(
      guideId,
      NotificationType.GENERAL,
      title,
      body,
      { ...data, url: '/tour-guide/my-trips' },
    );
    this.gateway.notifyUser(guideId, 'notification', notification);
    this.gateway.notifyAll('board:refresh', { action: 'guide_hold' });
  }
}

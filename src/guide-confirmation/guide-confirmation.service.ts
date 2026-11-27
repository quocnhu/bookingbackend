import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentExecutionMode,
  AssignmentStatus,
  GuideType,
  NotificationType,
  Prisma,
  RoleType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { MailService } from '@/mail/mail.service';
import {
  MAIL_LOGIN_CONFIRM_NOTE,
  MAIL_LOGIN_DETAIL_NOTE,
} from '@/mail/transport-alert.template';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import {
  GuideConfirmationStatus,
  QueryGuideConfirmationDto,
} from './dto/query-guide-confirmation.dto';

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/**
 * Guide assignment confirmation layer.
 *
 * When a guide is put on a bus the system emails them (through the template
 * mailbox) and shows an in-app notification. The guide logs in and confirms or
 * marks themselves unavailable. This is advisory: only an explicit decline
 * blocks dispatch until the admin reassigns or confirms by phone.
 */
@Injectable()
export class GuideConfirmationService {
  private readonly logger = new Logger(GuideConfirmationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async list(query: QueryGuideConfirmationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AssignmentWhereInput = {
      guideId: { not: null },
      executionMode: { not: AssignmentExecutionMode.OUTSOURCED_PARTNER },
      status: {
        in: [
          AssignmentStatus.DRAFT_ASSIGNED,
          AssignmentStatus.PENDING,
          AssignmentStatus.TRANSFERRED,
          AssignmentStatus.DISPATCHED,
        ],
      },
    };

    if (query.guideType) {
      where.guide = { guideProfile: { is: { type: query.guideType } } };
    }
    if (query.status === GuideConfirmationStatus.AWAITING) {
      where.guideConfirmedAt = null;
      where.guideDeclinedAt = null;
    } else if (query.status === GuideConfirmationStatus.CONFIRMED) {
      where.guideConfirmedAt = { not: null };
    } else if (query.status === GuideConfirmationStatus.DECLINED) {
      where.guideDeclinedAt = { not: null };
    }
    if (query.from || query.to) {
      where.startDate = {};
      if (query.from) where.startDate.gte = new Date(`${query.from}T00:00:00+07:00`);
      if (query.to) where.startDate.lte = new Date(`${query.to}T23:59:59.999+07:00`);
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
          ? GuideConfirmationStatus.DECLINED
          : a.guideConfirmedAt
            ? GuideConfirmationStatus.CONFIRMED
            : GuideConfirmationStatus.AWAITING;
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

  async request(
    assignmentId: string,
    options?: { actorId?: string | null; reminder?: boolean },
  ) {
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
    if (!assignment) return { requested: false, reason: 'NOT_FOUND' };
    if (!assignment.guide?.id) return { requested: false, reason: 'NO_GUIDE' };
    if (
      assignment.executionMode === AssignmentExecutionMode.OUTSOURCED_PARTNER
    ) {
      return { requested: false, reason: 'OUTSOURCED' };
    }
    if (
      assignment.status === AssignmentStatus.COMPLETED ||
      assignment.status === AssignmentStatus.CANCELED
    ) {
      return { requested: false, reason: 'FINISHED' };
    }
    if (options?.reminder && (assignment.guideConfirmedAt || assignment.guideDeclinedAt)) {
      return { requested: false, reason: 'ALREADY_RESPONDED' };
    }

    const requestedAt = new Date();
    const companyGuide =
      assignment.guide.guideProfile?.type === GuideType.OFFICIAL;
    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        guideConfirmationRequestedAt: requestedAt,
        // Company/OFFICIAL guides are auto-confirmed. Only freelance guides
        // must reply (or be confirmed by Admin/Officer on the phone).
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

    const notification = await this.notificationService.create(
      assignment.guide.id,
      NotificationType.GENERAL,
      title,
      body,
      {
        kind: 'GUIDE_CONFIRMATION_REQUEST',
        assignmentId: assignment.id,
        url: '/tour-guide/my-trips',
      },
    );
    this.gateway.notifyUser(assignment.guide.id, 'notification', notification);

    let emailed = false;
    const to = (assignment.guide.email ?? '').trim();
    if (EMAIL_RE.test(to)) {
      const frontend = (
        process.env.FRONTEND_URL ?? 'http://localhost:3000'
      ).replace(/\/$/, '');
      const result = await this.mail.sendTransportAlert({
        to: [to],
        title,
        message: `${body}\n\n${details}`,
        note: companyGuide ? MAIL_LOGIN_DETAIL_NOTE : MAIL_LOGIN_CONFIRM_NOTE,
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
    } else {
      this.logger.warn(
        `Guide ${assignment.guide.id} has no valid email for ${assignment.code ?? assignment.id}`,
      );
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

  /**
   * Backfill for legacy company-guide assignments that were requested before
   * the auto-confirm rule: mark the OFFICIAL guide as confirmed without
   * sending another confirmation email. Returns true when it changed a row.
   */
  async ensureCompanyGuideConfirmed(assignmentId: string): Promise<boolean> {
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
    if (!assignment?.guide) return false;
    if (assignment.guide.guideProfile?.type !== GuideType.OFFICIAL) {
      return false;
    }
    if (assignment.guideConfirmedAt || assignment.guideDeclinedAt) return false;
    const now = new Date();
    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        guideConfirmationRequestedAt:
          assignment.guideConfirmationRequestedAt ?? now,
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

  async confirm(assignmentId: string, actor: AuthenticatedUser) {
    const assignment = await this.loadAssignment(assignmentId);
    this.assertCanRespond(assignment, actor);
    if (!assignment.guideId) {
      throw new BadRequestException('This trip has no tour guide assigned');
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
      await this.notifyAdmins(
        'Tour guide confirmed',
        `${assignment.guide?.name ?? 'The guide'} confirmed ${assignment.tourName ?? assignment.code ?? 'the trip'} on ${this.formatWhen(assignment.startDate)}.`,
        assignment.id,
      );
    } else {
      await this.notifyGuide(
        assignment.guideId,
        'Assignment confirmed by the operator',
        `The operator confirmed your assignment for ${assignment.tourName ?? assignment.code ?? 'the trip'} on ${this.formatWhen(assignment.startDate)}.`,
        assignment.id,
      );
    }

    this.gateway.notifyAll('board:refresh', {
      assignmentId: assignment.id,
      action: 'guide_confirmed',
    });
    return { confirmedAt };
  }

  async decline(
    assignmentId: string,
    actor: AuthenticatedUser,
    reason?: string,
  ) {
    const assignment = await this.loadAssignment(assignmentId);
    this.assertCanRespond(assignment, actor);
    if (!assignment.guideId) {
      throw new BadRequestException('This trip has no tour guide assigned');
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

    await this.notifyAdmins(
      'Tour guide unavailable',
      `${assignment.guide?.name ?? 'The guide'} declined ${assignment.tourName ?? assignment.code ?? 'the trip'} on ${this.formatWhen(assignment.startDate)}${note ? ` — ${note}` : ''}. Reassign a guide before dispatching.`,
      assignment.id,
    );
    this.gateway.notifyAll('board:refresh', {
      assignmentId: assignment.id,
      action: 'guide_declined',
    });
    return { declinedAt };
  }

  async reset(assignmentId: string) {
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

  private async loadAssignment(assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        guide: { select: { id: true, name: true, email: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  private assertCanRespond(
    assignment: { guideId: string | null },
    actor: AuthenticatedUser,
  ) {
    if (this.isAdminOrOffice(actor)) return;
    if (actor.id !== assignment.guideId) {
      throw new ForbiddenException(
        'Only the assigned tour guide can update this confirmation',
      );
    }
  }

  private isAdminOrOffice(actor: AuthenticatedUser) {
    return actor.role === RoleType.ADMIN || actor.role === RoleType.OFFICE;
  }

  private async notifyAdmins(
    title: string,
    body: string,
    assignmentId: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: { role: { in: [RoleType.ADMIN, RoleType.OFFICE] }, isActive: true },
      select: { id: true },
    });
    for (const user of users) {
      const notification = await this.notificationService.create(
        user.id,
        NotificationType.GENERAL,
        title,
        body,
        {
          kind: 'GUIDE_CONFIRMATION_UPDATE',
          assignmentId,
          url: '/bookings?tab=assignments',
        },
      );
      this.gateway.notifyUser(user.id, 'notification', notification);
    }
  }

  private async notifyGuide(
    guideId: string,
    title: string,
    body: string,
    assignmentId: string,
  ) {
    const notification = await this.notificationService.create(
      guideId,
      NotificationType.GENERAL,
      title,
      body,
      {
        kind: 'GUIDE_CONFIRMATION_UPDATE',
        assignmentId,
        url: '/tour-guide/my-trips',
      },
    );
    this.gateway.notifyUser(guideId, 'notification', notification);
  }

  private formatWhen(value: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}

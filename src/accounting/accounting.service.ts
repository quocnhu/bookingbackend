import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentStatus,
  DriverType,
  FeeFlowType,
  GuideType,
  PayeeType,
  Prisma,
  RoleType,
  TourReportStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { NotificationType } from '@prisma/client';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import {
  CreateSettlementCategoryDto,
  CreateSettlementDto,
  ExportPeriodDto,
  ListPeopleQueryDto,
  PeriodQueryDto,
  RejectMoneyDto,
  VerifyTourMoneyDto,
  VoidPeriodDto,
} from './dto/accounting.dto';

const PAYABLE_ROLES: RoleType[] = [RoleType.TOUR_GUIDE, RoleType.DRIVER];

export const PAYEE_LABELS: Record<PayeeType, string> = {
  [PayeeType.TRANSPORT_PROVIDER]: 'Transportation Provider',
  [PayeeType.COMPANY_GUIDE]: 'Company Tour Guide',
  [PayeeType.COMPANY_DRIVER]: 'Company Driver',
  [PayeeType.FREELANCE]: 'Freelance (driver & guide)',
};

const num = (v: unknown): number => Number(v ?? 0);
const round2 = (v: number): number => Math.round(v * 100) / 100;

type Tx = Prisma.TransactionClient;

export interface Payee {
  id: string;
  kind: 'PERSON' | 'PROVIDER';
  name: string;
  email: string | null;
  role: RoleType;
  userType: string | null;
  providerName: string | null;
  providerIsCompany: boolean | null;
  payeeType: PayeeType;
}

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Shared Accounting Room: ADMIN or OFFICE has the
   * accounting.* permissions (see seed.ts). Not open to guides/drivers.
   */
  private assertAccounting(actor: AuthenticatedUser, perm?: string) {
    if (actor.role === RoleType.ADMIN) return;
    if (actor.role !== RoleType.OFFICE) {
      throw new ForbiddenException('Accounting Room is staff only');
    }
    if (perm && !actor.permissions?.includes(perm)) {
      throw new ForbiddenException(`Missing permission: ${perm}`);
    }
  }

  private async assertPayable(personId: string): Promise<{
    id: string;
    name: string;
    role: RoleType;
  }> {
    const person = await this.prisma.user.findUnique({
      where: { id: personId },
      select: { id: true, name: true, role: true },
    });
    if (!person) throw new NotFoundException('Person not found');
    if (!PAYABLE_ROLES.includes(person.role)) {
      throw new BadRequestException(
        'Only tour guides and drivers can be paid out',
      );
    }
    return { id: person.id, name: person.name ?? '—', role: person.role };
  }

  private range(fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to = new Date(`${toDate}T23:59:59.999`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (from > to) throw new BadRequestException('fromDate must be <= toDate');
    return { from, to };
  }

  // ── Revenue/expense categories ───────────────────────────────────────────

  async listCategories(actor: AuthenticatedUser) {
    this.assertAccounting(actor);
    return this.prisma.settlementCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(
    actor: AuthenticatedUser,
    dto: CreateSettlementCategoryDto,
  ) {
    this.assertAccounting(actor, 'accounting.category.create');
    const existing = await this.prisma.settlementCategory.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Category code "${dto.code}" already exists`);
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

  // ── Revenue/expense of one trip ────────────────────────────────────

  /** Throws if the trip's money is already locked — after locking it is immutable. */
  private async assertTourMutable(assignmentId: string) {
    const report = await this.prisma.tourReport.findUnique({
      where: { assignmentId },
      select: { moneyVerifiedAt: true },
    });
    if (report?.moneyVerifiedAt) {
      throw new ConflictException(
        'Tour money is locked (verified by Accounting). Post a reversing entry instead of editing.',
      );
    }
  }

  /**
   * A guide/driver sees the money of their own trip before submitting the report.
   *
   * The Accounting Room is staff-only, but the trip creator must know how much
   * they owe the company (or how much the company owes them) before clicking
   * "Confirm finished". So there is a separate read/write path, restricted only
   * by trip: the actor must be the exact guide or driver of that assignment.
   */
  private async assertOwnTour(assignmentId: string, actor: AuthenticatedUser) {
    if (actor.role === RoleType.ADMIN || actor.role === RoleType.OFFICE) return;
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { guideId: true, driverId: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (actor.id !== assignment.guideId && actor.id !== assignment.driverId) {
      throw new ForbiddenException('You can only see money for your own tour');
    }
  }

  /** The money sheet of one trip — for staff as well as that trip's guide/driver. */
  async tourMoney(actor: AuthenticatedUser, assignmentId: string) {
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

  /**
   * A guide/driver adds their own entry (money the company owes them, or money
   * they owe the company).
   *
   * `bookingId` is optional: link it to a specific booking when the entry is a
   * collection/refund for one passenger (e.g. "collected money from passenger
   * GR-0187", "refunded passenger due to a canceled service").
   * Leave blank = an entry shared by the whole trip.
   */
  async addTourMoney(
    actor: AuthenticatedUser,
    assignmentId: string,
    dto: CreateSettlementDto,
  ) {
    await this.assertOwnTour(assignmentId, actor);
    return this.createSettlementCore(actor, assignmentId, dto);
  }

  async listSettlements(actor: AuthenticatedUser, assignmentId: string) {
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

  async createSettlement(
    actor: AuthenticatedUser,
    assignmentId: string,
    dto: CreateSettlementDto,
  ) {
    this.assertAccounting(actor, 'accounting.settlement.create');
    return this.createSettlementCore(actor, assignmentId, dto);
  }

  /** Creates a settlement — shared by the Accounting Room and the guide/driver. */
  private async createSettlementCore(
    actor: AuthenticatedUser,
    assignmentId: string,
    dto: CreateSettlementDto,
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, code: true, guideId: true, driverId: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assertTourMutable(assignmentId);

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
        select: { assignmentId: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.assignmentId !== assignmentId) {
        throw new BadRequestException('Booking does not belong to this tour');
      }
    }

    const created = await this.prisma.settlement.create({
      data: {
        amount: new Prisma.Decimal(dto.amount),
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

  async updateSettlement(
    actor: AuthenticatedUser,
    id: string,
    dto: { amount?: number; note?: string; categoryId?: string },
  ) {
    this.assertAccounting(actor, 'accounting.settlement.update');
    const existing = await this.prisma.settlement.findUnique({
      where: { id },
      include: { reversedBy: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Settlement not found');
    // Write-once for everyone except ADMIN: others can only edit their own line.
    if (existing.createdById !== actor.id && actor.role !== RoleType.ADMIN) {
      throw new ForbiddenException('You can only edit an entry you added');
    }
    if (existing.reversedBy) {
      throw new ConflictException('Entry was reversed — create a new entry');
    }
    if (existing.assignmentId)
      await this.assertTourMutable(existing.assignmentId);

    const updated = await this.prisma.settlement.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined
          ? { amount: new Prisma.Decimal(dto.amount) }
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

  /** A guide/driver deletes an entry THEY just added on that very trip (only
   *  while the money is not yet locked). Historical reversal lines
   *  (reversesId / reversedBy) are kept and cannot be deleted. */
  async deleteTourMoney(
    actor: AuthenticatedUser,
    assignmentId: string,
    settlementId: string,
  ) {
    await this.assertOwnTour(assignmentId, actor);
    const entry = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { reversedBy: { select: { id: true } } },
    });
    if (!entry || entry.assignmentId !== assignmentId) {
      throw new NotFoundException('This entry does not belong to this trip');
    }
    // Write-once for everyone except ADMIN: others can only delete their own line.
    // Correct via a new adjusting entry, or Return the sheet for resubmission.
    if (entry.createdById !== actor.id && actor.role !== RoleType.ADMIN) {
      throw new ForbiddenException('You can only delete an entry you added');
    }
    if (entry.reversedBy) {
      throw new ConflictException('Cannot delete a reversed entry');
    }
    if (entry.reversesId) {
      throw new ConflictException('Cannot delete a reversal entry');
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

  async deleteSettlement(actor: AuthenticatedUser, id: string) {
    this.assertAccounting(actor, 'accounting.settlement.delete');
    const original = await this.prisma.settlement.findUnique({
      where: { id },
      include: { reversedBy: { select: { id: true } } },
    });
    if (!original) throw new NotFoundException('Settlement not found');
    // Write-once for everyone except ADMIN: others can only delete their own line.
    if (original.createdById !== actor.id && actor.role !== RoleType.ADMIN) {
      throw new ForbiddenException('You can only delete an entry you added');
    }
    if (original.reversedBy) {
      throw new ConflictException('Cannot delete a reversed entry');
    }
    if (original.reversesId) {
      throw new ConflictException('Cannot delete a reversal entry; delete the original instead');
    }
    // Locked money is immutable — deletions would let live rows drift away
    // from the locked netAmount. Correct mistakes before locking.
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

  // ── Compute the net for one trip from its Settlement lines ──────────────────
  //
  // Deliberately NOT read from a manually set flag but derived from the real cash lines:
  //   - line category.flowType = COLLECT_MONEY → the trip creator owes the company
  //   - line category.flowType = PAY_MONEY     → the company owes the trip creator
  // A line without a category is treated as a company expense (PAY_MONEY).
  /** Totals a list of settlements that already include their category. */
  private sumRows(
    rows: {
      amount: unknown;
      category: { flowType?: FeeFlowType | null } | null;
    }[],
  ) {
    let collected = 0; // collected on behalf → the trip creator owes the company
    let paid = 0; // paid out by the company → the company owes the trip creator

    for (const r of rows) {
      const amount = num(r.amount);
      const flow = r.category?.flowType ?? FeeFlowType.PAY_MONEY;
      if (flow === FeeFlowType.COLLECT_MONEY) collected += amount;
      else paid += amount;
    }

    return {
      collected: round2(collected),
      paid: round2(paid),
      net: round2(collected - paid),
      // net > 0 → the trip creator pays the company; net < 0 → the company pays them.
      flow:
        collected >= paid ? FeeFlowType.COLLECT_MONEY : FeeFlowType.PAY_MONEY,
      entryCount: rows.length,
    };
  }

  private async computeNet(assignmentId: string) {
    const rows = await this.prisma.settlement.findMany({
      where: { assignmentId },
      include: {
        category: { select: { code: true, name: true, flowType: true } },
      },
    });
    return this.sumRows(rows);
  }

  // ── Sub-tab 2: verification queue ─────────────────────────────────────

  /**
   * Trip is closed (finalizedAt set) but Accounting has not locked the money yet.
   * This is the pending work in the Accounting Room.
   */
  /**
   * The payee of a trip = the guide on the assignment. Not manually selectable.
   *
   * The report (TourReport) is submitted by the guide to the Accounting Room, so
   * the payee is taken straight from the guide on the assignment template — it is
   * not guessed from whoever submitted the template (OFFICE may submit on their
   * behalf) and it cannot be switched to the driver.
   */
  private resolveDefaultPayee(a: {
    guideId?: string | null;
  }): { id: string; basis: 'ASSIGNMENT_GUIDE' } | null {
    if (a.guideId) return { id: a.guideId, basis: 'ASSIGNMENT_GUIDE' };
    return null;
  }

  async verificationQueue(actor: AuthenticatedUser) {
    this.assertAccounting(actor);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
    const assignments = await this.prisma.assignment.findMany({
      where: {
        OR: [
          // Pending money verification: report submitted (or content-verified by
          // admin), money not yet locked or returned.
          {
            tourReport: {
              is: {
                status: { in: ['SUBMITTED', 'VERIFIED'] },
                moneyVerifiedAt: null,
                moneyRejectedAt: null,
              },
            },
          },
          // Recently money-locked: show confirmation badge in actions (no review button)
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
      // Stable order (startDate + code), NOT submittedAt:
      // ordering by submittedAt pushed an edited/resubmitted trip to the
      // bottom on every change. Start date + code never change on edit.
      orderBy: [{ startDate: 'asc' }, { code: 'asc' }, { id: 'asc' }],
    });

    const now = Date.now();
    const items = await Promise.all(
      assignments.map(async (a) => {
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
            if (!d) return null;
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
      }),
    );
    return items;
  }

  /**
   * Locks the money for one trip. After this step every revenue/expense line of
   * the trip is immutable and the trip becomes eligible for an export period.
   * There is no way back.
   */
  async verifyTourMoney(
    actor: AuthenticatedUser,
    assignmentId: string,
    dto: VerifyTourMoneyDto,
  ) {
    this.assertAccounting(actor, 'accounting.money.verify');
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { tourReport: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (!assignment.tourReport?.submittedAt) {
      throw new ConflictException('Tour report has not been submitted yet');
    }
    if (assignment.tourReport.moneyVerifiedAt) {
      throw new ConflictException('Tour money was already verified and locked');
    }
    if (assignment.tourReport.moneyRejectedAt) {
      throw new ConflictException(
        'Tour money was returned to the submitter — waiting for them to re-submit',
      );
    }

    // The payee is the guide on the assignment. The server is the source of truth: if
    // the client sends a different one, throw an error instead of silently ignoring it.
    const payableToId = this.resolveDefaultPayee(assignment)?.id ?? null;
    if (!payableToId) {
      throw new BadRequestException(
        'This trip has no guide yet, so the payee cannot be determined',
      );
    }
    if (dto.payableToId && dto.payableToId !== payableToId) {
      throw new BadRequestException(
        'The payee is the guide on the assignment and cannot be changed',
      );
    }
    await this.assertPayable(payableToId);

    // A report needs at least one money entry — the notice is shown to the
    // user on the submit/verify screens; this guard is the final backstop.
    const net = await this.computeNet(assignmentId);
    if (net.entryCount === 0) {
      throw new ConflictException(
        'Tour has no settlement entries — add at least one Collect/Expense entry before verifying',
      );
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      // Update tour report: lock money + mark as VERIFIED + finalize
      const report = await tx.tourReport.update({
        where: { assignmentId },
        data: {
          settlementFlow: net.flow,
          netAmount: new Prisma.Decimal(net.net),
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

      // Complete the assignment
      await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          status: AssignmentStatus.COMPLETED,
          reportVerifierId: actor.id,
        },
      });

      return report;
    });

    await this.notifySubmitter(assignment, {
      type: NotificationType.MONEY_VERIFIED,
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
      } as Prisma.InputJsonValue,
      changedBy: actor.id,
    });
    this.gateway.notifyAll('board:refresh', {
      assignmentId,
      action: 'money_verified',
    });
    return { ...updated, net, payableToId };
  }

  private async payeeName(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return u?.name ?? userId;
  }

  /**
   * Notifies whoever submitted the template (accounting sends the revenue/expense
   * money sheet back for review). Skipped if the submitter no longer exists.
   */
  private async notifySubmitter(
    assignment: {
      id: string;
      code?: string | null;
      tourReport: { submittedById?: string | null } | null;
    },
    msg: { type: NotificationType; title: string; body: string },
  ) {
    const to = assignment.tourReport?.submittedById ?? null;
    if (!to) return;
    const notif = await this.notificationService.create(
      to,
      msg.type,
      msg.title,
      msg.body,
      {
        assignmentId: assignment.id,
      },
    );
    this.gateway.notifyUser(to, 'notification', notif);
  }

  /**
   * Accounting reviews the money sheet and sends it back: it does NOT lock the
   * money, records the reason, and tells the submitter to review it again. The
   * trip leaves the queue until it is re-submitted (re-submitting clears the
   * moneyRejected* fields).
   */
  async rejectMoney(
    assignmentId: string,
    dto: RejectMoneyDto,
    actor: AuthenticatedUser,
  ) {
    this.assertAccounting(actor, 'accounting.money.reject');

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { tourReport: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (!assignment.tourReport) {
      throw new NotFoundException('This tour has no submitted money sheet');
    }
    if (!assignment.tourReport.submittedAt) {
      throw new ConflictException('Tour report has not been submitted yet');
    }
    if (assignment.tourReport.moneyVerifiedAt) {
      throw new ConflictException('Tour money was already verified and locked');
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
      type: NotificationType.MONEY_REJECTED,
      title: `❌ Money sheet "${assignment.code}" was sent back`,
      body: `Accounting sent back the revenue/expense money sheet for trip ${assignment.tourName ?? ''}. Reason: ${dto.reason}`,
    });

    await this.audit.log({
      entityType: 'TourReport',
      entityId: updated.id,
      action: 'REJECT_MONEY',
      beforeData: { moneyRejectedAt: null } as Prisma.InputJsonValue,
      afterData: {
        moneyRejectedAt: updated.moneyRejectedAt,
        reason: dto.reason,
      } as Prisma.InputJsonValue,
      changedBy: actor.id,
    });

    this.gateway.notifyAll('board:refresh', {
      assignmentId,
      action: 'money_rejected',
    });
    return updated;
  }

  // ── Sub-tab 1: payment period ────────────────────────────────────────

  /**
   * A person's "Paid through" = the largest toDate among the exported periods.
   * Used as the default fromDate for the next review.
   */
  private async watermarkFor(personId?: string) {
    if (!personId) return null;
    const last = await this.prisma.paymentPeriod.findFirst({
      where: { personId, voidedAt: null },
      orderBy: { toDate: 'desc' },
      select: { toDate: true },
    });
    return last?.toDate ?? null;
  }

  /**
   * Determines the payee person/transport provider for a period. payeeType
   * decides how it is looked up:
   *  - TRANSPORT_PROVIDER → payeeId is a providerId
   *  - otherwise → payeeId is a userId (guide or driver)
   */
  private async resolvePayee(
    payeeType?: PayeeType,
    payeeId?: string,
  ): Promise<
    | (Payee & {
        id: string;
        kind: 'PERSON' | 'PROVIDER';
        payeeType: PayeeType;
      })
    | null
  > {
    if (!payeeId) {
      if (payeeType) throw new BadRequestException('payeeId is required');
      return null;
    }

    if (payeeType === PayeeType.TRANSPORT_PROVIDER) {
      const p = await this.prisma.transportationProvider.findUnique({
        where: { id: payeeId },
        select: { id: true, name: true, isCompany: true },
      });
      if (!p) throw new NotFoundException('Transportation provider not found');
      if (p.isCompany) {
        throw new BadRequestException(
          'This provider is the company fleet — use Company Driver instead',
        );
      }
      return {
        id: p.id,
        kind: 'PROVIDER',
        name: p.name,
        email: null,
        role: RoleType.TRANSPORT_PROVIDER,
        userType: null,
        providerName: p.name,
        providerIsCompany: p.isCompany,
        payeeType: PayeeType.TRANSPORT_PROVIDER,
      };
    }

    // Payee person: derive the group automatically if the client does not send payeeType.
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
    if (!u) throw new NotFoundException('Person not found');
    if (!PAYABLE_ROLES.includes(u.role)) {
      throw new BadRequestException(
        'Only tour guides and drivers can be paid out',
      );
    }
    const derived = this.classifyPayee({
      role: u.role,
      providerId: u.providerId,
      providerIsCompany: u.provider?.isCompany,
      guideProfile: u.guideProfile,
      driverProfile: u.driverProfile,
    });
    if (payeeType && derived !== payeeType) {
      throw new BadRequestException(
        `${u.name ?? 'This person'} belongs to "${PAYEE_LABELS[derived]}", not "${PAYEE_LABELS[payeeType]}"`,
      );
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

  /**
   * Classifies one person into a payee group. Source of truth:
   *  - Guide: GuideProfile.type (OFFICIAL = in-house, FREELANCE = freelance)
   *  - Driver: User.providerId != null → belongs to an external transport
   *    provider; otherwise DriverProfile.type decides in-house vs freelance.
   */
  private classifyPayee(u: {
    role: RoleType;
    providerId?: string | null;
    providerIsCompany?: boolean | null;
    guideProfile?: { type: GuideType } | null;
    driverProfile?: { type: DriverType } | null;
  }): PayeeType {
    if (u.role === RoleType.TOUR_GUIDE) {
      return u.guideProfile?.type === GuideType.OFFICIAL
        ? PayeeType.COMPANY_GUIDE
        : PayeeType.FREELANCE;
    }
    // For the company's own vehicles (isCompany) the driver is still a company
    // person, not a person of an external transport provider.
    if (u.role === RoleType.TRANSPORT_PROVIDER)
      return PayeeType.TRANSPORT_PROVIDER;
    if (u.providerId && u.providerIsCompany === false) {
      return PayeeType.TRANSPORT_PROVIDER;
    }
    if (u.role === RoleType.DRIVER) {
      return u.driverProfile?.type === DriverType.FREELANCE
        ? PayeeType.FREELANCE
        : PayeeType.COMPANY_DRIVER;
    }
    return PayeeType.FREELANCE;
  }

  /**
   * The list of payees (people/transport providers), grouped into the 4 groups.
   * Each person carries their own "paid through", so each group has its own
   * payment timeline.
   */
  async people(actor: AuthenticatedUser, query: ListPeopleQueryDto) {
    this.assertAccounting(actor);
    const roles = query.role ? [query.role as RoleType] : PAYABLE_ROLES;
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

    // Drivers of an external transport provider are not the paying entity — the
    // paying entity is the provider, and those drivers appear as rows in that
    // provider's money sheet.
    const staffOnly = users.filter(
      (u) =>
        !(
          u.role === RoleType.DRIVER &&
          u.providerId &&
          u.provider?.isCompany === false
        ),
    );

    const payees: Payee[] = staffOnly.map((u) => ({
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

    // External transport provider: 1 row, the export groups all trips of that provider.
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
        role: RoleType.TRANSPORT_PROVIDER,
        userType: null,
        providerName: p.name,
        providerIsCompany: false,
        payeeType: PayeeType.TRANSPORT_PROVIDER,
      });
    }

    const withWatermark = await Promise.all(
      payees.map(async (p) => ({
        ...p,
        paidThrough: await this.watermarkFor(p.id),
      })),
    );

    const groups = (Object.keys(PAYEE_LABELS) as PayeeType[]).map((t) => ({
      payeeType: t,
      label: PAYEE_LABELS[t],
      payees: withWatermark.filter((p) => p.payeeType === t),
    }));
    return { groups, payees: withWatermark };
  }

  /**
   * Preview a period. Writes NOTHING.
   *
   * - Transport provider (TRANSPORT_PROVIDER): the money comes from that
   *   provider's TOUR PRICE LIST (RoutePrice / the price settled for the trip),
   *   NOT from settlements — settlements are the guide's/driver's business. Only
   *   a closed tour is needed.
   * - Person (guide/driver): the locked net. Total = collected - paid;
   *   positive = the trip creator pays the company.
   */
  async periodPreview(actor: AuthenticatedUser, query: PeriodQueryDto) {
    this.assertAccounting(actor);
    const { from, to } = this.range(query.fromDate, query.toDate);
    const payee = await this.resolvePayee(
      query.payeeType,
      query.payeeId ?? query.personId,
    );

    // Anything already exported is left out of the preview (prevents double payment).
    const exportedAssignments = payee
      ? (
          await this.prisma.paymentPeriodLine.findMany({
            where: {
              // A voided period's trips must be exportable again.
              period: { voidedAt: null },
              ...(payee.kind === 'PROVIDER'
                ? { assignment: { providerId: payee.id } }
                : { payableToId: payee.id }),
            },
            select: { assignmentId: true },
          })
        ).map((l) => l.assignmentId)
      : [];

    const isProvider = payee?.kind === 'PROVIDER';

    const closedInRange: Prisma.TourReportWhereInput = {
      finalizedAt: { gte: from, lte: to },
    };
    const verifiedInRange: Prisma.TourReportWhereInput = {
      ...closedInRange,
      moneyVerifiedAt: { not: null },
      ...(query.unpaidOnly ? { netAmount: { not: null } } : {}),
    };

    const where: Prisma.AssignmentWhereInput = {
      status: AssignmentStatus.COMPLETED,
      tourReport: { is: isProvider ? closedInRange : verifiedInRange },
    };
    if (payee) {
      if (isProvider) {
        // Every trip run with that provider's vehicle, regardless of who drives.
        where.providerId = payee.id;
      } else {
        // Do not filter by "took part in the trip" — filter by the person who was
        // SETTLED as the payee. A trip has only one net, so filtering by
        // guideId/driverId would make both of them see it and export it →
        // double payment.
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

    // Provider price list: the price settled specifically for the trip takes
    // priority, then the provider's tour price list (RoutePrice by tour + provider + vehicle).
    const routePrices = isProvider
      ? await this.prisma.routePrice.findMany({
          where: { providerId: payee.id },
          select: { tourId: true, vehicleId: true, price: true },
        })
      : [];
    const priceByKey = new Map(
      routePrices.map((r) => [`${r.tourId}|${r.vehicleId}`, num(r.price)]),
    );

    const lines = assignments
      .filter((a) => !exportedAssignments.includes(a.id))
      .map((a) => {
        if (isProvider) {
          const tourId = a.bookings?.[0]?.tourId ?? null;
          const fromTable = tourId
            ? priceByKey.get(`${tourId}|${a.vehicleId ?? ''}`)
            : undefined;
          const hasOverride =
            a.priceOverride !== null && a.priceOverride !== undefined;
          const price = hasOverride ? num(a.priceOverride) : (fromTable ?? 0);
          return {
            assignmentId: a.id,
            code: a.code,
            // "Which provider does the driver belong to" → we only need to know which, and how much.
            tourName: a.tourName,
            plateNumber: a.vehicle?.plateNumber ?? null,
            driver: a.driver,
            provider: a.provider,
            tourDate: a.tourReport?.finalizedAt ?? null,
            amount: price,
            basis: 'ROUTE_PRICE' as const,
            // No price in either place → warn the admin, do NOT silently use 0.
            priceMissing: !hasOverride && fromTable === undefined,
            direction: 'COMPANY_TO_PROVIDER' as const,
          };
        }

        const net = num(a.tourReport?.netAmount);
        const flow = a.tourReport?.settlementFlow ?? FeeFlowType.COLLECT_MONEY;
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
          basis: 'NET_SETTLEMENT' as const,
          netAmount: net,
          flow,
          direction:
            flow === FeeFlowType.PAY_MONEY
              ? 'COMPANY_TO_PERSON'
              : 'PERSON_TO_COMPANY',
        };
      });

    if (isProvider) {
      const totalPrice = round2(lines.reduce((sum, l) => sum + l.amount, 0));
      return {
        mode: 'ROUTE_PRICE' as const,
        fromDate: from,
        toDate: to,
        person: payee,
        paidThrough: payee ? await this.watermarkFor(payee.id) : null,
        lines,
        tourCount: lines.length,
        totalPrice,
        companyReturnsToProvider: totalPrice,
        direction: 'COMPANY_TO_PROVIDER' as const,
        // Read-only statement: every trip in the range for this
        // provider with its paid status (never exported from here).
        statement: payee
          ? await this.statementForProvider(
              payee.id,
              from,
              to,
              priceByKey,
              new Set(lines.map((l) => l.assignmentId)),
            )
          : [],
      };
    }

    let personReturnsToCompany = 0;
    let companyReturnsToPerson = 0;
    for (const l of lines) {
      if (l.flow === FeeFlowType.PAY_MONEY)
        companyReturnsToPerson += Math.abs(l.amount);
      else personReturnsToCompany += l.amount;
    }
    const totalNet = round2(personReturnsToCompany - companyReturnsToPerson);

    return {
      mode: 'SETTLEMENT' as const,
      fromDate: from,
      toDate: to,
      person: payee,
      paidThrough: payee ? await this.watermarkFor(payee.id) : null,
      lines,
      tourCount: lines.length,
      personReturnsToCompany: round2(personReturnsToCompany),
      companyReturnsToPerson: round2(companyReturnsToPerson),
      totalNet,
      direction:
        totalNet > 0
          ? 'PERSON_TO_COMPANY'
          : totalNet < 0
            ? 'COMPANY_TO_PERSON'
            : 'SETTLED',
      // Read-only statement: every trip in the range involving
      // this person (as guide, driver, or money payee) with its paid
      // status. The range means WORK DAYS (trip start/end overlapping the
      // range) — not the money-locked date — so crew can check "what did
      // I work and is it paid". Drivers settle nothing themselves (one
      // trip has one net, settled with the guide) — but this lets
      // Accounting check per crew member per range whether each trip is
      // paid or not.
      statement: payee
        ? await this.statementForPerson(
            payee.id,
            from,
            to,
            new Set(lines.map((l) => l.assignmentId)),
          )
        : [],
    };
  }

  /**
   * Statement rows for one person: trips overlapping the range (work days)
   * where they took part (guide and/or driver). `exportable` mirrors the
   * export list exactly (same set as `lines`), so a driver can never
   * export another person's money (no double-pay).
   */
  private async statementForPerson(
    personId: string,
    from: Date,
    to: Date,
    exportableIds: Set<string>,
  ) {
    const trips = await this.prisma.assignment.findMany({
      where: {
        status: { not: AssignmentStatus.CANCELED },
        startDate: { lte: to },
        endDate: { gte: from },
        OR: [{ guideId: personId }, { driverId: personId }],
      },
      select: {
        id: true,
        code: true,
        tourName: true,
        status: true,
        startDate: true,
        endDate: true,
        guideId: true,
        driverId: true,
        vehicle: { select: { plateNumber: true } },
        provider: { select: { id: true, name: true } },
        guide: { select: { name: true } },
        driver: { select: { name: true } },
        tourReport: {
          select: {
            moneyVerifiedAt: true,
            netAmount: true,
            settlementFlow: true,
            moneyPayableTo: { select: { id: true, name: true } },
          },
        },
        paymentLines: {
          where: { period: { voidedAt: null } },
          select: {
            payableTo: { select: { id: true, name: true } },
            period: { select: { id: true, fromDate: true, toDate: true } },
          },
          take: 1,
        },
      },
      orderBy: { startDate: 'asc' },
    });
    return trips.map((a) => {
      const line = a.paymentLines[0] ?? null;
      const roles: string[] = [];
      if (a.guideId === personId) roles.push('GUIDE');
      if (a.driverId === personId) roles.push('DRIVER');
      return {
        assignmentId: a.id,
        code: a.code,
        tourName: a.tourName,
        tourDate: a.startDate,
        endDate: a.endDate,
        status: a.status,
        plateNumber: a.vehicle?.plateNumber ?? null,
        providerName: a.provider?.name ?? null,
        guideName: a.guide?.name ?? null,
        driverName: a.driver?.name ?? null,
        myRole: roles.join('+') || '—',
        netAmount:
          a.tourReport?.netAmount != null
            ? num(a.tourReport.netAmount)
            : null,
        flow: a.tourReport?.settlementFlow ?? null,
        locked: !!a.tourReport?.moneyVerifiedAt,
        paid: !!line,
        paidToName: line?.payableTo?.name ?? null,
        periodToDate: line?.period?.toDate ?? null,
        exportable: exportableIds.has(a.id),
        settlesWith: a.tourReport?.moneyPayableTo?.name ?? null,
      };
    });
  }

  /**
   * Statement rows for one transport provider: trips overlapping the range
   * (work days) run with its vehicles, with paid status. Amounts mirror
   * the preview rule (trip price override, else the provider's tour price
   * list; a paid trip keeps its frozen exported amount).
   */
  private async statementForProvider(
    providerId: string,
    from: Date,
    to: Date,
    priceByKey: Map<string, number>,
    exportableIds: Set<string>,
  ) {
    const trips = await this.prisma.assignment.findMany({
      where: {
        status: { not: AssignmentStatus.CANCELED },
        providerId,
        startDate: { lte: to },
        endDate: { gte: from },
      },
      select: {
        id: true,
        code: true,
        tourName: true,
        status: true,
        startDate: true,
        endDate: true,
        vehicleId: true,
        priceOverride: true,
        vehicle: { select: { plateNumber: true } },
        provider: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } },
        bookings: { select: { tourId: true }, take: 1 },
        tourReport: { select: { moneyVerifiedAt: true } },
        paymentLines: {
          where: { period: { voidedAt: null } },
          select: {
            netAmount: true,
            period: { select: { id: true, fromDate: true, toDate: true } },
          },
          take: 1,
        },
      },
      orderBy: { startDate: 'asc' },
    });
    return trips.map((a) => {
      const line = a.paymentLines[0] ?? null;
      const tourId = a.bookings?.[0]?.tourId ?? null;
      const fromTable = tourId
        ? priceByKey.get(`${tourId}|${a.vehicleId ?? ''}`)
        : undefined;
      const hasOverride =
        a.priceOverride !== null && a.priceOverride !== undefined;
      return {
        assignmentId: a.id,
        code: a.code,
        tourName: a.tourName,
        tourDate: a.startDate,
        endDate: a.endDate,
        status: a.status,
        plateNumber: a.vehicle?.plateNumber ?? null,
        providerName: a.provider?.name ?? null,
        driverName: a.driver?.name ?? null,
        myRole: 'PROVIDER',
        netAmount: line ? num(line.netAmount) : null,
        flow: null,
        locked: !!a.tourReport?.moneyVerifiedAt,
        paid: !!line,
        paidToName: null,
        periodToDate: line?.period?.toDate ?? null,
        exportable: exportableIds.has(a.id),
        settlesWith: null,
        amount: line
          ? num(line.netAmount)
          : hasOverride
            ? num(a.priceOverride)
            : (fromTable ?? 0),
        priceMissing: line ? false : !hasOverride && fromTable === undefined,
      };
    });
  }

  /**
   * Export a period: freezes the detail lines into PaymentPeriodLine, then moves
   * that person's "paid through" up to toDate. Re-running the same period will
   * not double-pay because trips already present in a previous period are left
   * out of the preview.
   */
  async exportPeriod(actor: AuthenticatedUser, dto: ExportPeriodDto) {
    this.assertAccounting(actor, 'accounting.period.export');
    const payee = await this.resolvePayee(dto.payeeType, dto.payeeId);
    if (!payee) throw new BadRequestException('payeeId is required');
    const preview = await this.periodPreview(actor, {
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      payeeType: payee.payeeType,
      payeeId: payee.id,
    });

    if (preview.tourCount === 0) {
      throw new ConflictException(
        payee.kind === 'PROVIDER'
          ? 'No completed trips for this provider in this range — nothing to pay'
          : 'No unexported verified tours in this range — nothing to pay out',
      );
    }

    // Prevent double payment: a new period must not start before the most recent exported period.
    if (payee.kind === 'PROVIDER' && preview.lines.some((l) => !l.driver)) {
      throw new ConflictException(
        'Some tours in this range have no driver on the assignment, so the ' +
          'provider statement cannot be itemised. Assign a driver first.',
      );
    }

    if (preview.mode === 'ROUTE_PRICE') {
      const missing = preview.lines.filter((l) => l.priceMissing);
      if (missing.length) {
        throw new ConflictException(
          `No price in the tour price table for ${missing.length} trip(s) ` +
            `(e.g. ${missing[0].tourName ?? missing[0].code}). Set a price ` +
            'for the provider + vehicle, or override the trip price, before exporting.',
        );
      }
    }

    const watermark = await this.watermarkFor(payee.id);
    const from = new Date(dto.fromDate);
    if (watermark && from <= watermark) {
      throw new ConflictException(
        'This range starts on or before the last exported period — exporting it risks paying twice. Pick a later start date.',
      );
    }

    const period = await this.prisma.$transaction(async (tx: Tx) => {
      const created = await tx.paymentPeriod.create({
        data: {
          personId: payee.id,
          payeeType: payee.payeeType,
          payeeName: payee.name,
          fromDate: from,
          toDate: preview.toDate,
          tourCount: preview.tourCount,
          // Transport provider: what the company owes the provider = the total of the price list. Person: the net revenue/expense.
          personReturnsToCompany: new Prisma.Decimal(
            preview.mode === 'ROUTE_PRICE' ? 0 : preview.personReturnsToCompany,
          ),
          companyReturnsToPerson: new Prisma.Decimal(
            preview.mode === 'ROUTE_PRICE'
              ? preview.companyReturnsToProvider
              : preview.companyReturnsToPerson,
          ),
          totalNet: new Prisma.Decimal(
            preview.mode === 'ROUTE_PRICE'
              ? -preview.totalPrice
              : preview.totalNet,
          ),
          note: dto.note ?? null,
          createdById: actor.id,
          createdByName: actor.name ?? null,
          lines: {
            create: preview.lines
              // The provider's period line is attached to the DRIVER who actually drove that
              // vehicle; if the trip has no driver it is attached to the provider itself.
              .map((l) => ({
                assignmentId: l.assignmentId,
                // The provider's period line is attached to the DRIVER who actually
                // drove that vehicle so it stays traceable; payableToId is an FK to
                // User so a provider id must NEVER be assigned here.
                payableToId:
                  payee.kind === 'PROVIDER' ? l.driver!.id : payee.id,
                tourName: l.tourName,
                tourDate: l.tourDate ?? preview.toDate,
                netAmount: new Prisma.Decimal(l.amount),
                flow:
                  l.basis === 'ROUTE_PRICE' ? FeeFlowType.PAY_MONEY : l.flow,
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
          total:
            preview.mode === 'ROUTE_PRICE'
              ? preview.totalPrice
              : preview.totalNet,
        } as Prisma.InputJsonValue,
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

  // ── Sub-tab 3: history ─────────────────────────────────────────────

  /**
   * VOIDS an exported period because it is wrong. The period is not deleted —
   * it is marked as voided so it stays auditable — but every piece of logic
   * (watermark, double-payment guard) skips it, so the trips in that period can
   * be exported again right away.
   */
  async voidPeriod(
    actor: AuthenticatedUser,
    periodId: string,
    dto: VoidPeriodDto,
  ) {
    this.assertAccounting(actor, 'accounting.period.void');
    const period = await this.prisma.paymentPeriod.findUnique({
      where: { id: periodId },
      include: { _count: { select: { lines: true } } },
    });
    if (!period) throw new NotFoundException('Payment period not found');
    if (period.voidedAt) {
      throw new ConflictException('This period was already voided');
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
      } as Prisma.InputJsonValue,
      afterData: {
        voidedAt: voided.voidedAt,
        voidedBy: actor.email,
        reason: dto.reason,
      } as Prisma.InputJsonValue,
      changedBy: actor.id,
    });
    return voided;
  }

  async periodHistory(actor: AuthenticatedUser, personId?: string) {
    this.assertAccounting(actor);
    const periods = await this.prisma.paymentPeriod.findMany({
      where: personId ? { personId } : {},
      include: {
        lines: { orderBy: { tourDate: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    // personId can be a userId OR a providerId (period of an external transport provider).
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
    const byId = new Map<
      string,
      { id: string; name: string; role: string | null }
    >([
      ...users.map(
        (u) => [u.id, { id: u.id, name: u.name ?? '—', role: u.role }] as const,
      ),
      ...providers.map(
        (pr) =>
          [
            pr.id,
            { id: pr.id, name: pr.name, role: 'TRANSPORT_PROVIDER' },
          ] as const,
      ),
    ]);
    return periods.map((p) => ({
      id: p.id,
      person: byId.get(p.personId) ?? {
        id: p.personId,
        name: p.payeeName ?? '—',
        role: null,
      },
      payeeType: p.payeeType,
      // Still show voided periods (clearly marked) so the admin can see what error was handled.
      voidedAt: p.voidedAt,
      voidedByName: p.voidedByName,
      voidReason: p.voidReason,
      fromDate: p.fromDate,
      toDate: p.toDate,
      tourCount: p.tourCount,
      personReturnsToCompany: num(p.personReturnsToCompany),
      companyReturnsToPerson: num(p.companyReturnsToPerson),
      totalNet: num(p.totalNet),
      direction:
        num(p.totalNet) > 0
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

  /**
   * Overall watermark for the period screen: up to which date each person has been paid.
   */
  async watermarkOverview(actor: AuthenticatedUser) {
    this.assertAccounting(actor);
    const periods = await this.prisma.paymentPeriod.findMany({
      where: { voidedAt: null },
      orderBy: { toDate: 'desc' },
      select: { personId: true, toDate: true },
    });
    const map = new Map<string, Date>();
    for (const p of periods) {
      if (!map.has(p.personId)) map.set(p.personId, p.toDate);
    }
    return [...map.entries()].map(([personId, toDate]) => ({
      personId,
      toDate,
    }));
  }

  /** Closed tours that have no report yet (used for the reconciliation report). */
  async unverifiedReportCount(actor: AuthenticatedUser) {
    this.assertAccounting(actor);
    return this.prisma.tourReport.count({
      where: {
        finalizedAt: { not: null },
        moneyVerifiedAt: null,
        status: { in: [TourReportStatus.VERIFIED, TourReportStatus.SUBMITTED] },
      },
    });
  }
}

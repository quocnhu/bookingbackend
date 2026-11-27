import { Injectable, Logger } from '@nestjs/common';
import {
  AssignmentExecutionMode,
  AssignmentStatus,
  GuideType,
  RoleType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { GuideConfirmationService } from '@/guide-confirmation/guide-confirmation.service';
import {
  tripDayRange,
  unavailableCrewIds,
} from '@/common/utils/crew-availability.util';

/**
 * Auto-crew (the "assign guide + driver" step in bookingflow.md):
 * - Prefers professional guides (GuideType.OFFICIAL) and Company Fleet drivers
 *   (provider.isCompany); never assigns someone on leave or already booked on
 *   another trip.
 * - Only fills in missing crew (guideId/driverId = null) and never overrides the
 *   admin's manual assignment.
 */
@Injectable()
export class AutoCrewService {
  private readonly logger = new Logger(AutoCrewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly guideConfirmation: GuideConfirmationService,
  ) {}

  /** Assign an available guide + driver to a bus if it does not yet have a full crew. */
  async assignCrewForBus(assignmentId: string) {
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
        provider: { select: { isCompany: true } },
        executionMode: true,
      },
    });
    if (!assignment) return { assigned: false };
    if (assignment.executionMode === AssignmentExecutionMode.OUTSOURCED_PARTNER)
      return { assigned: false };
    const needsGuide =
      assignment.executionMode !== AssignmentExecutionMode.COMPANY_DRIVER_ONLY;
    if ((!needsGuide || assignment.guideId) && assignment.driverId)
      return { assigned: false };

    const { start, end } = tripDayRange(
      assignment.startDate,
      assignment.endDate,
    );

    const updates: {
      guideId?: string;
      driverId?: string;
      providerId?: string;
    } = {};
    if (needsGuide && !assignment.guideId) {
      const guide = await this.pickUser(
        RoleType.TOUR_GUIDE,
        assignment.id,
        start,
        end,
        assignment.providerId,
      );
      if (guide) updates.guideId = guide.id;
    }
    if (!assignment.driverId) {
      const externalProvider =
        !!assignment.providerId && assignment.provider?.isCompany === false;
      if (!externalProvider) {
        // Company fleet first. With no provider selected we deliberately only
        // consider company drivers; when none is free the transport-request
        // flow picks one external provider for this bus.
        const onlyCompany = !assignment.providerId;
        const driver = await this.pickUser(
          RoleType.DRIVER,
          assignment.id,
          start,
          end,
          assignment.providerId,
          onlyCompany,
        );
        if (driver) {
          updates.driverId = driver.id;
          if (!assignment.providerId && driver.providerId) {
            updates.providerId = driver.providerId;
          }
        }
      }
    }

    if (updates.guideId || updates.driverId || updates.providerId) {
      await this.prisma.assignment.update({
        where: { id: assignment.id },
        data: updates,
      });
      if (updates.guideId) {
        void this.guideConfirmation
          .request(assignment.id)
          .catch((error) =>
            this.logger.warn(
              `Guide confirmation request failed for ${assignment.code ?? assignment.id}: ${(error as Error).message}`,
            ),
          );
      }
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

  /** Fill in the missing crew for every bus with passengers within [today, +horizonDays]. */
  async assignMissingCrew(horizonDays = 7) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + horizonDays);
    end.setHours(23, 59, 59, 999);

    const assignments = await this.prisma.assignment.findMany({
      where: {
        status: {
          in: [AssignmentStatus.DRAFT_ASSIGNED, AssignmentStatus.PENDING],
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
      if (result.updates?.guideId) guideAssigned++;
      if (result.updates?.driverId) driverAssigned++;
    }

    return { scanned: assignments.length, guideAssigned, driverAssigned };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Pick an available user: guide / driver, not on leave/hold or double-booked. */
  private async pickUser(
    role: RoleType,
    excludeAssignmentId: string,
    start: Date,
    end: Date,
    providerId: string | null,
    onlyCompany = false,
  ): Promise<{
    id: string;
    providerId: string | null;
    isCompany: boolean;
  } | null> {
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
    const unavailable = await unavailableCrewIds(
      this.prisma,
      role === RoleType.TOUR_GUIDE ? 'guide' : 'driver',
      users.map((u) => u.id),
      start,
      end,
      excludeAssignmentId,
    );

    const candidates: Array<{
      id: string;
      providerId: string | null;
      isCompany: boolean;
      company: number;
      rating: number;
      name: string;
    }> = [];
    for (const u of users) {
      if (unavailable.has(u.id)) continue;

      const isCompany = !!u.provider?.isCompany;
      if (role === RoleType.DRIVER) {
        if (onlyCompany && !isCompany) continue;
        if (providerId && !isCompany && u.providerId !== providerId) continue;
      }

      let company = 0;
      if (role === RoleType.DRIVER) {
        if (isCompany) company = 2;
        else if (u.providerId && u.providerId === providerId) company = 1;
      } else if (u.guideProfile?.type === GuideType.OFFICIAL) {
        company = 2;
      }
      const rating =
        role === RoleType.DRIVER
          ? (u.driverProfile?.rating ?? 0)
          : (u.guideProfile?.rating ?? 0);
      candidates.push({
        id: u.id,
        providerId: u.providerId,
        isCompany,
        company,
        rating,
        name: u.name ?? '',
      });
    }

    candidates.sort(
      (a, b) =>
        b.company - a.company ||
        b.rating - a.rating ||
        a.name.localeCompare(b.name),
    );
    const best = candidates[0];
    return best
      ? {
          id: best.id,
          providerId: best.providerId,
          isCompany: best.isCompany,
        }
      : null;
  }
}

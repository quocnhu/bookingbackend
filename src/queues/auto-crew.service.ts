import { Injectable, Logger } from '@nestjs/common';
import {
  AssignmentStatus,
  GuideType,
  RoleType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { LeavesService } from '@/leaves/leaves.service';
import { AuditService } from '@/audit/audit.service';

/**
 * Auto-crew (bước "gán HDV + tài xế" trong bookingflow.md):
 * - Ưu tiên guide nghiệp vụ (GuideType.OFFICIAL) và tài xế của Company Fleet
 *   (provider.isCompany), không gán người đang nghỉ phép hoặc trùng lịch chuyến khác.
 * - Chỉ điền crew còn thiếu (guideId/driverId = null), không bao giờ override
 *   gán thủ công của admin.
 */
@Injectable()
export class AutoCrewService {
  private readonly logger = new Logger(AutoCrewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaves: LeavesService,
    private readonly audit: AuditService,
  ) {}

  /** Gán guide + driver khả dụng cho 1 bus nếu bus chưa có đủ crew. */
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
      },
    });
    if (!assignment) return { assigned: false };
    if (assignment.guideId && assignment.driverId)
      return { assigned: false };

    const start = this.normalizeStart(assignment.startDate);
    const end = this.normalizeEnd(assignment.endDate);

    const updates: { guideId?: string; driverId?: string } = {};
    if (!assignment.guideId) {
      const guideId = await this.pickUserId(
        RoleType.TOUR_GUIDE,
        assignment.id,
        start,
        end,
        assignment.providerId,
      );
      if (guideId) updates.guideId = guideId;
    }
    if (!assignment.driverId) {
      const driverId = await this.pickUserId(
        RoleType.DRIVER,
        assignment.id,
        start,
        end,
        assignment.providerId,
      );
      if (driverId) updates.driverId = driverId;
    }

    if (updates.guideId || updates.driverId) {
      await this.prisma.assignment.update({
        where: { id: assignment.id },
        data: updates,
      });
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

  /** Điền crew còn thiếu cho toàn bộ bus có khách trong [hôm nay, +horizonDays]. */
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

  private normalizeStart(d: Date) {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    return s;
  }

  private normalizeEnd(d: Date) {
    const e = new Date(d);
    e.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    return e;
  }

  /** Chọn 1 user khả dụng: hướng dẫn viên / tài xế, không nghỉ phép, không trùng lịch. */
  private async pickUserId(
    role: RoleType,
    excludeAssignmentId: string,
    start: Date,
    end: Date,
    providerId: string | null,
  ): Promise<string | null> {
    const busy = await this.busyUserIds(role, start, end, excludeAssignmentId);
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

    const candidates: Array<{
      id: string;
      company: number;
      rating: number;
      name: string;
    }> = [];
    for (const u of users) {
      if (busy.has(u.id)) continue;
      const onLeave = await this.leaves.hasLeaveConflict(u.id, start, end);
      if (onLeave) continue;

      let company = 0;
      if (role === RoleType.DRIVER) {
        if (u.provider?.isCompany) company = 2;
        else if (u.providerId && u.providerId === providerId) company = 1;
      } else if (u.guideProfile?.type === GuideType.OFFICIAL) {
        company = 2;
      }
      const rating =
        role === RoleType.DRIVER
          ? (u.driverProfile?.rating ?? 0)
          : (u.guideProfile?.rating ?? 0);
      candidates.push({ id: u.id, company, rating, name: u.name ?? '' });
    }

    candidates.sort(
      (a, b) =>
        b.company - a.company || b.rating - a.rating || a.name.localeCompare(b.name),
    );
    return candidates[0]?.id ?? null;
  }

  private async busyUserIds(
    role: RoleType,
    start: Date,
    end: Date,
    excludeAssignmentId: string,
  ): Promise<Set<string>> {
    const field = role === RoleType.DRIVER ? 'driverId' : 'guideId';
    const rows = await this.prisma.assignment.findMany({
      where: {
        status: {
          notIn: [AssignmentStatus.CANCELED, AssignmentStatus.COMPLETED],
        },
        id: { not: excludeAssignmentId },
        [field]: { not: null },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: {
        driverId: true,
        guideId: true,
      } as any,
    });
    const ids = rows
      .map((r) => (r as any)[field] as string | null)
      .filter((x): x is string => Boolean(x));
    return new Set(ids);
  }
}
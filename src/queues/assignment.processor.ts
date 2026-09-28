import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  AssignmentOrigin,
  AssignmentStatus,
  BookingStatus,
  TourType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { AssignmentBoardService } from './assignment-board.service';
import { AutoCrewService } from './auto-crew.service';
import { ASSIGN_QUEUE } from './queue.constants';
import { AssignJobData } from './assignment.queue';

/** Một chuyến xe (bus) chở tối đa 12 khách — theo bookingflow.md. */
const BUS_MAX_PAX = 12;

/**
 * BullMQ worker Stage 3: booking → Assignment.
 * Tìm 1 chuyến xe đang MỞ (DRAFT_ASSIGNED/PENDING) cùng ngày, cùng tourType,
 * còn sức chứa → attach booking (status => ASSIGNED) + refresh summary.
 * Không tìm được bus → booking giữ PENDING để admin xếp tay trên Dispatch Board.
 */
@Injectable()
@Processor(ASSIGN_QUEUE, { concurrency: 5 })
export class AssignmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AssignmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly board: AssignmentBoardService,
    private readonly auditService: AuditService,
    private readonly autoCrew: AutoCrewService,
  ) {
    super();
  }

  async process(job: Job<AssignJobData>) {
    const { bookingId } = job.data;
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tour: true },
    });
    if (!booking) return { skipped: true, reason: 'BOOKING_NOT_FOUND' };
    if (booking.status === BookingStatus.CANCELED)
      return { skipped: true, reason: 'CANCELED' };
    if (booking.assignmentId)
      return {
        skipped: true,
        reason: 'ALREADY_ASSIGNED',
        assignmentId: booking.assignmentId,
      };
    if (!booking.startingDate)
      return { skipped: true, reason: 'NO_START_DATE' };

    const candidate = await this.findCandidate(booking);
    // Không có chuyến mở (PENDING/DRAFT) cùng ngày → tự tạo 1 bus mới
    // cho tour của booking (bookingflow.md bước 3) để Dispatch Board có dữ liệu.
    if (!candidate) {
      const bus = await this.createBusForBooking(booking);
      this.logger.log(
        `No open bus for booking ${booking.bookingRef} — created bus ${bus.code}`,
      );
      const result = await this.board.attach(bus.id, bookingId);
      if (!result.assigned) {
        return { skipped: true, reason: 'ASSIGN_FAILED' };
      }
      await this.auditService.log({
        entityType: 'Assignment',
        entityId: bus.id,
        action: 'AUTO_CREATE_BUS',
        afterData: {
          bookingId,
          bookingRef: booking.bookingRef,
          assignmentId: bus.id,
        },
        changedBy: null,
      });
      await this.assignCrew(bus.id);
      return {
        status: 'CREATED_BUS',
        bookingId,
        bookingRef: booking.bookingRef,
        assignmentId: bus.id,
      };
    }

    const result = await this.board.attach(candidate.id, bookingId);
    if (!result.assigned) {
      return { skipped: true, reason: 'ASSIGN_FAILED' };
    }

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: candidate.id,
      action: 'AUTO_ASSIGN',
      afterData: { bookingId, bookingRef: booking.bookingRef },
      changedBy: null,
    });

    this.logger.log(
      `Auto-assigned booking ${booking.bookingRef} -> bus ${candidate.code ?? candidate.id}`,
    );
    await this.assignCrew(candidate.id);
    return {
      status: 'ASSIGNED',
      bookingId,
      bookingRef: booking.bookingRef,
      assignmentId: candidate.id,
    };
  }

  /** Điền crew (HDV + tài xế) còn thiếu cho bus — auto-crew không bao giờ override gán thủ công. */
  private async assignCrew(assignmentId: string) {
    try {
      const { assigned } = await this.autoCrew.assignCrewForBus(assignmentId);
      if (assigned) {
        this.logger.log(`Auto-assigned crew for bus ${assignmentId}`);
      }
    } catch (error) {
      this.logger.warn(
        `Auto-crew skipped for bus ${assignmentId}: ${(error as Error).message}`,
      );
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Tạo 1 bus (assignment) cho booking khi chưa có chuyến mở nào phù hợp
   * (bookingflow.md: "nếu booking với tour chưa có sẽ tạo 1 khối tượng trưng cho bus").
   * Bus mới ở trạng thái PENDING để admin xếp HDV/tài xế trên Dispatch Board.
   */
  private async createBusForBooking(booking: any) {
    const startDate = new Date(booking.startingDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const durationDays = booking.tour?.durationDays ?? 1;
    const endDate = new Date(
      startDate.getTime() + Math.max(1, durationDays - 1) * 86400000,
    );
    const label = booking.tourType === TourType.PRIVATE_TOUR ? 'Priv' : 'Group';
    const existing = await this.prisma.assignment.findMany({
      where: { code: { startsWith: `${label} Bus -` } },
      select: { code: true },
    });
    const numbers = existing
      .map((a) => parseInt((a.code ?? '').split('-')[1]?.trim() ?? '0', 10))
      .filter((n) => !Number.isNaN(n));
    const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
    // Ưu tiên gắn xe của Company Fleet (nếu còn khả dụng cùng ngày) để tận dụng
    // tài sản công ty trước khi thuê ngoài — xe công ty phí 0 VND (priceOverride = 0).
    const companyVehicle = await this.findCompanyVehicle(
      booking,
      startDate,
      endDate,
    );
    return this.prisma.assignment.create({
      data: {
        code: `${label} Bus - ${nextNumber}`,
        startDate,
        endDate,
        status: AssignmentStatus.PENDING,
        origin: AssignmentOrigin.AUTO_ASSIGN,
        tourType: booking.tourType ?? null,
        tourName: booking.tourName ?? booking.tour?.name ?? undefined,
        durationDays,
        totalPax: booking.totalPax ?? 0,
        createdWho: 'Auto-Assign System',
        vehicleId: companyVehicle?.id ?? null,
        providerId: companyVehicle?.providerId ?? null,
        priceOverride: companyVehicle?.provider?.isCompany ? 0 : undefined,
      },
    });
  }

  /** Tìm xe của Company Fleet còn rảnh trong khoảng [startDate, endDate] và đủ sức chứa. */
  private async findCompanyVehicle(booking: any, startDate: Date, endDate: Date) {
    const pax = booking.totalPax ?? 1;
    return this.prisma.vehicle.findFirst({
      where: {
        capacity: { gte: pax },
        provider: { isCompany: true },
        assignments: {
          none: {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
            status: {
              notIn: [AssignmentStatus.CANCELED, AssignmentStatus.COMPLETED],
            },
          },
        },
      },
      orderBy: [{ capacity: 'asc' }],
      select: { id: true, providerId: true, provider: { select: { isCompany: true } } },
    });
  }

  private async findCandidate(booking: any) {
    const candidates = await this.prisma.assignment.findMany({
      where: {
        status: {
          in: [AssignmentStatus.DRAFT_ASSIGNED, AssignmentStatus.PENDING],
        },
        startDate: { lte: booking.startingDate },
        endDate: { gte: booking.startingDate },
      },
      include: {
        bookings: true,
        vehicle: {
          select: {
            id: true,
            capacity: true,
            provider: { select: { isCompany: true } },
          },
        },
      },
      orderBy: [{ startDate: 'asc' }],
    });

    const typeOk = (a: any) =>
      booking.tourType == null ||
      a.tourType == null ||
      a.tourType === booking.tourType;
    const capOk = (a: any) => {
      const used = a.bookings.reduce(
        (sum: number, b: any) => sum + (b.totalPax ?? 0),
        0,
      );
      return (
        used + (booking.totalPax ?? 0) <=
        Math.min(a.vehicle?.capacity ?? BUS_MAX_PAX, BUS_MAX_PAX)
      );
    };

    const matches = candidates.filter((a) => typeOk(a) && capOk(a));
    if (matches.length === 0) return null;

    // Ưu tiên: bus của Company Fleet (xe công ty) > đúng tourType > còn ít chỗ nhất.
    matches.sort((a, b) => {
      const aCompany = a.vehicle?.provider?.isCompany ? 0 : 1;
      const bCompany = b.vehicle?.provider?.isCompany ? 0 : 1;
      if (aCompany !== bCompany) return aCompany - bCompany;
      const aExact = a.tourType === booking.tourType ? 0 : 1;
      const bExact = b.tourType === booking.tourType ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return this.freeSeats(a) - this.freeSeats(b);
    });
    return matches[0];
  }

  private freeSeats(a: any): number {
    const cap = Math.min(a.vehicle?.capacity ?? BUS_MAX_PAX, BUS_MAX_PAX);
    const used = a.bookings.reduce(
      (sum: number, b: any) => sum + (b.totalPax ?? 0),
      0,
    );
    return cap - used;
  }
}